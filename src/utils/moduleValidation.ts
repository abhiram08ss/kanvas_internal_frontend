/**
 * Validation rules for the Add / Edit Module form. Each validator returns an error message or `null`.
 * The backend (`CourseModuleIn` in app/schemas.py and services/module_media.py) enforces the same rules again.
 */
/** Letters (any language), numbers, spaces and everyday title punctuation - the same set a course title allows. */
const TITLE_REGEX = /^[\p{L}\p{M}\p{N} &'’()[\],.:;!?\-_/+#@%]+$/u

export const MODULE_TITLE_MIN = 3
export const MODULE_TITLE_MAX = 200
export const ORDER_MAX = 9999
export const DURATION_MAX_MINUTES = 1440 // a full day
export const CONTENT_MAX = 200_000
export const MEDIA_MAX_MB = 100

const hasLetterOrDigit = (text: string) => /[\p{L}\p{N}]/u.test(text)

export function validateModuleTitle(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Module title is required.'
  if (v.length < MODULE_TITLE_MIN) return `Module title must be at least ${MODULE_TITLE_MIN} characters.`
  if (v.length > MODULE_TITLE_MAX) return `Module title must be ${MODULE_TITLE_MAX} characters or fewer.`
  if (!hasLetterOrDigit(v)) return 'Module title must contain letters or numbers, not only punctuation.'
  if (!TITLE_REGEX.test(v)) return "Use letters, numbers, spaces and common punctuation (& ' ( ) , . : - _) only."
  return null
}

export function validateOrder(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Sequence order is required.'
  if (!/^[1-9]\d*$/.test(v)) return 'Enter a whole number of 1 or more.'
  if (Number(v) > ORDER_MAX) return `Sequence order cannot be more than ${ORDER_MAX}.`
  return null
}

/** Minutes, optional. A trailing "min" / "minutes" typed by an older record is tolerated and dropped on save. */
export const DURATION_REGEX = /^(\d{1,4})(?:\s*(?:min|mins|minutes))?$/i
export function validateModuleDuration(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const m = DURATION_REGEX.exec(v)
  if (!m) return 'Enter the duration as a whole number of minutes, for example 15.'
  const n = Number(m[1])
  if (n < 1) return 'Duration must be at least 1 minute.'
  if (n > DURATION_MAX_MINUTES) return `Duration cannot be more than ${DURATION_MAX_MINUTES} minutes.`
  return null
}
export const normalizeDuration = (value: string) => {
  const m = DURATION_REGEX.exec(value.trim())
  return m ? String(Number(m[1])) : value.trim()
}

/** A text / hybrid module needs something to read or watch: visible text, or an embedded image / video / link. */
export function validateModuleContent(html: string, kind: 'text' | 'hybrid'): string | null {
  if (html.length > CONTENT_MAX) return 'The content is too long. Split it into more than one module.'
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, '')
  const hasEmbed = /<(img|video|iframe|a)\b/i.test(html)
  if (text.length === 0 && !(kind === 'hybrid' && hasEmbed)) {
    return kind === 'hybrid' ? 'Add some text, an image or a video to this module.' : 'Module content is required. Write something for learners to read.'
  }
  return null
}

// ---------------------------------------------------------------- files
export const MEDIA_EXTENSIONS: Record<string, string[]> = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
  video: ['mp4', 'webm', 'mov', 'ogg'],
  document: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
}
MEDIA_EXTENSIONS.hybrid = [...MEDIA_EXTENSIONS.image, ...MEDIA_EXTENSIONS.video, ...MEDIA_EXTENSIONS.document]

/** Does the start of the file look like the type its extension claims? (Extensions and MIME types can be faked.) */
export async function sniffMatchesExtension(file: Blob, ext: string): Promise<boolean> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const at = (sig: number[], offset = 0) => sig.every((x, i) => b[offset + i] === x)
  const ascii = (s: string, offset = 0) => at([...s].map((c) => c.charCodeAt(0)), offset)
  switch (ext) {
    case 'png': return at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'jpg':
    case 'jpeg': return at([0xff, 0xd8, 0xff])
    case 'gif': return ascii('GIF8')
    case 'webp': return ascii('RIFF') && ascii('WEBP', 8)
    case 'pdf': return ascii('%PDF')
    case 'docx':
    case 'pptx': return ascii('PK')
    case 'doc':
    case 'ppt': return at([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    case 'mp4':
    case 'mov': return ascii('ftyp', 4) || ascii('moov', 4) || ascii('mdat', 4) || ascii('free', 4) || ascii('wide', 4)
    case 'webm': return at([0x1a, 0x45, 0xdf, 0xa3])
    case 'ogg': return ascii('OggS')
    default: return false
  }
}

export async function validateModuleFile(file: File, kind: string): Promise<string | null> {
  const allowed = MEDIA_EXTENSIONS[kind] ?? []
  const ext = file.name.includes('.') ? (file.name.split('.').pop() ?? '').toLowerCase() : ''
  if (!allowed.includes(ext)) return `That file type isn't allowed for a ${kind} module. Allowed: ${allowed.map((e) => '.' + e).join(', ')}`
  if (file.size === 0) return 'The selected file is empty.'
  if (file.size > MEDIA_MAX_MB * 1024 * 1024) return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB - the limit is ${MEDIA_MAX_MB} MB.`
  if (!(await sniffMatchesExtension(file, ext))) return `This file does not look like a real .${ext} file. Choose the original file.`
  return null
}

/** A pasted video link: https only, no spaces, and a recognisable host or video file. */
export function validateVideoLink(value: string, isRecognised: (url: string) => boolean): string | null {
  const v = value.trim()
  if (!v) return null
  if (/\s/.test(v)) return 'The link cannot contain spaces.'
  if (!/^https?:\/\//i.test(v)) return 'The link must start with https://'
  if (v.length > 500) return 'The link is too long.'
  if (!isRecognised(v)) return 'Paste a YouTube or Vimeo link, or a direct .mp4 / .webm link.'
  return null
}
