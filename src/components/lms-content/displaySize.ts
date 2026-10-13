/** How wide an image / video module is shown. It is saved in the module's (otherwise unused) `content` field as a
 *  small HTML comment, so no database change is needed; anything without the marker shows at full width. */
export const DISPLAY_SIZES = [
  { value: 25, label: 'Small (25%)' },
  { value: 50, label: 'Medium (50%)' },
  { value: 75, label: 'Large (75%)' },
  { value: 100, label: 'Full width (100%)' },
] as const

export function parseDisplaySize(content: string | null | undefined): number {
  const m = /<!--\s*display-size:(\d{1,3})\s*-->/.exec(content ?? '')
  const n = m ? Number(m[1]) : 100
  return DISPLAY_SIZES.some((s) => s.value === n) ? n : 100
}

export const displaySizeMarker = (size: number) => `<!-- display-size:${size} -->`

/** The optional external video link of a video module (used only when no file is uploaded), saved next to the size. */
export function parseVideoUrl(content: string | null | undefined): string {
  const m = /<!--\s*video-url:(\S+?)\s*-->/.exec(content ?? '')
  return m ? decodeURIComponent(m[1]) : ''
}

export const videoUrlMarker = (url: string) => (url.trim() ? `<!-- video-url:${encodeURIComponent(url.trim())} -->` : '')
