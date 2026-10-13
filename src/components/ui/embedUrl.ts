/** Turns a YouTube / Vimeo link into its embeddable player URL, or null for anything else. */
export function toEmbedUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.replace(/^www\./, '')
  if (host === 'youtu.be') return /^[\w-]{6,}$/.test(url.pathname.slice(1)) ? `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}` : null
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1]
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
  }
  if (host === 'vimeo.com') {
    const id = url.pathname.match(/^\/(\d+)/)?.[1]
    return id ? `https://player.vimeo.com/video/${id}` : null
  }
  return null
}

/** A direct link to a video file (.mp4 / .webm / .ogg / .mov) that a plain <video> tag can play. */
export const isDirectVideoUrl = (raw: string) => /^https?:\/\/\S+\.(mp4|webm|ogg|mov)(\?\S*)?$/i.test(raw.trim())
