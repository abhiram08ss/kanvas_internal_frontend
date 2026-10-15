import { useId } from 'react'
import './KLoader.css'

const K_PATH = 'M6 4h11v15.5L31 4h14L26 24l20 20H31L17 28.5V44H6z'
const SIZES = { lg: 72, md: 40, sm: 24 } as const

/**
 * The one brand loader: the K from the Kanvas logo fills up with purple, then resets.
 * Sizes: lg 72 (full page), md 40 (cards, panels), sm 24 (inline). `onDark` swaps to a light K for dark backgrounds.
 */
export function KLoader({ size = 'md', onDark = false }: { size?: keyof typeof SIZES; onDark?: boolean }) {
  const id = useId().replace(/:/g, '')
  const px = SIZES[size]
  return (
    <svg className={`kloader${onDark ? ' is-dark' : ''}`} width={px} height={px} viewBox="0 0 52 48" role="img" aria-label="Loading">
      <defs>
        <clipPath id={`k-${id}`}><path d={K_PATH} /></clipPath>
      </defs>
      <path className="kloader-base" d={K_PATH} />
      <g clipPath={`url(#k-${id})`}>
        <rect className="kloader-fill" x="0" y="0" width="52" height="48" />
      </g>
    </svg>
  )
}

/** Compact ring with a small K inside, for buttons and quick actions. */
export function KRing({ size = 18 }: { size?: number }) {
  return (
    <span className="kring" style={{ width: size, height: size }} role="img" aria-label="Loading">
      <span className="kring-arc" />
      <svg viewBox="0 0 52 48" width={size * 0.5} height={size * 0.5}><path d={K_PATH} fill="currentColor" /></svg>
    </span>
  )
}

/** Floating pill ("K  Updating list…") that sits on top of existing content while it refreshes. */
export function KPill({ label }: { label: string }) {
  return (
    <span className="kpill" role="status">
      <KLoader size="sm" />
      {label}
    </span>
  )
}
