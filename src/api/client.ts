// Thin fetch wrapper for the Kanvas backend: base URL, bearer token, and readable errors.

const BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000/api'
const TOKEN_KEY = 'kanvas-admin-token'

/** Origin of the backend (e.g. http://localhost:8000); SCORM content and its player are served from here. */
export const API_ORIGIN: string = new URL(BASE_URL, window.location.origin).origin

/** Fired when the server rejects our token (expired, revoked, user deactivated). */
export const UNAUTHORIZED_EVENT = 'kanvas:unauthorized'

/**
 * The sign-in token. "Remember me" keeps it in localStorage (survives closing the browser); otherwise it lives in
 * sessionStorage (gone when the tab closes). Reads check both; clearing removes both.
 */
export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY),
  set: (token: string, remember = false) => {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
    ;(remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token)
  },
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
  },
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong'
}

type Query = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Query
  /** false for endpoints (login) where a 401 means "bad credentials", not "session expired". */
  auth?: boolean
  /** Lets the request finish even if the page is closed meanwhile (for clean-up sent while unloading). */
  keepalive?: boolean
}

function buildUrl(path: string, params?: Query): string {
  const url = new URL(BASE_URL + path, window.location.origin)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

// FastAPI returns `detail` as a string, or as a list of {loc, msg} for validation errors.
function detailToMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: (string | number)[]; msg?: string }) => {
        const field = (d.loc ?? []).filter((p) => p !== 'body').join('.')
        return field ? `${field}: ${d.msg}` : (d.msg ?? '')
      })
      .join('; ')
  }
  return fallback
}

async function send(path: string, opts: RequestOptions, extraHeaders: Record<string, string> = {}): Promise<Response> {
  const headers: Record<string, string> = { ...extraHeaders }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  // FormData (file uploads) must not get a Content-Type: the browser adds it with the multipart boundary.
  const isForm = opts.body instanceof FormData
  if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(buildUrl(path, opts.params), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      keepalive: opts.keepalive,
    })
  } catch {
    throw new ApiError(`Cannot reach the server at ${BASE_URL}. Is the backend running?`, 0)
  }

  if (!res.ok) {
    if (res.status === 401 && opts.auth !== false) {
      tokenStore.clear()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    let detail: unknown
    try {
      detail = (await res.json()).detail
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detailToMessage(detail, `Request failed (${res.status})`), res.status)
  }
  return res
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await send(path, opts, { Accept: 'application/json' })
  return (res.status === 204 ? undefined : await res.json()) as T
}

/** Download an authenticated file (e.g. the audit-log CSV) through the browser. */
export async function download(path: string, filename: string, params?: Query): Promise<void> {
  const res = await send(path, { params })
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface LiveProgressEvent {
  userId: number
  userName: string
  /** "" for a single-module package. */
  scoId: string
  moduleTitle: string | null
  lessonStatus: string
  lessonLocation: string
  scoreRaw: string
  updatedAt: string
}

/**
 * Opens a live (Server-Sent Events) connection for a SCORM package's progress: `onEvent` fires once per
 * learner immediately on connect (their current state), then again the moment anyone's progress on this
 * package changes - no polling. Reconnects automatically (with backoff) if the connection drops.
 *
 * Uses `fetch` with a manually-read stream rather than the native `EventSource` API, because
 * `EventSource` can't send an Authorization header and this endpoint is authenticated like any other.
 * Returns a function that closes the connection for good.
 */
export function watchLiveProgress(
  packageId: string,
  onEvent: (e: LiveProgressEvent) => void,
  onStatus?: (status: 'connecting' | 'open' | 'error') => void,
): () => void {
  const controller = new AbortController()

  async function connectOnce(): Promise<void> {
    const token = tokenStore.get()
    const res = await fetch(buildUrl(`/scorm/${encodeURIComponent(packageId)}/live`), {
      headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: controller.signal,
    })
    if (!res.ok || !res.body) throw new ApiError(`Live progress unavailable (${res.status})`, res.status)
    onStatus?.('open')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '))
        if (dataLine) onEvent(JSON.parse(dataLine.slice('data: '.length)) as LiveProgressEvent)
      }
    }
  }

  let attempt = 0
  async function loop(): Promise<void> {
    while (!controller.signal.aborted) {
      onStatus?.('connecting')
      try {
        await connectOnce()
        attempt = 0 // a clean end (e.g. the tab was backgrounded and the browser closed the connection)
      } catch {
        if (controller.signal.aborted) return
        onStatus?.('error')
        attempt++
      }
      if (controller.signal.aborted) return
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * attempt, 8000)))
    }
  }
  void loop()

  return () => controller.abort()
}
