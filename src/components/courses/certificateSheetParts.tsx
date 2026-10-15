import type { CSSProperties } from 'react'

/** Inline-SVG ornaments for the certificate sheet. Inline styles / SVG only, so the sheet's HTML can be copied into a print window as-is. */

export const GOLD = '#D4A93C'

/** Wavy corner decoration: layered translucent waves in the template's primary colour with a thin gold line. */
export function CornerWave({ id, color, style }: { id: string; color: string; style: CSSProperties }) {
  return (
    <svg viewBox="0 0 400 260" style={{ position: 'absolute', width: '32cqw', height: 'auto', pointerEvents: 'none', ...style }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.62" />
          <stop offset="1" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={color} stopOpacity="0.2" />
          <stop offset="1" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d="M0 0H400C300 20 200 60 120 110C70 140 30 120 0 150Z" fill={`url(#${id}-b)`} />
      <path d="M0 0H340C260 30 170 20 100 90C60 130 30 170 0 210Z" fill={`url(#${id}-a)`} />
      <path d="M0 190C70 150 120 80 230 40C280 22 320 12 360 0" fill="none" stroke={GOLD} strokeWidth="1.6" opacity="0.85" />
    </svg>
  )
}

/** A laurel branch (leaves along a curved stem), drawn faintly as a watermark. Pass `flip` for the right-hand branch. */
export function Laurel({ color, flip, style }: { color: string; flip?: boolean; style: CSSProperties }) {
  const P0 = [62, 190]
  const P1 = [10, 110]
  const P2 = [38, 14]
  const at = (t: number) => {
    const x = (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t ** 2 * P2[0]
    const y = (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t ** 2 * P2[1]
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0])
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1])
    return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI }
  }
  const leaves = Array.from({ length: 9 }, (_, i) => 0.08 + i * 0.105)
  return (
    <svg
      viewBox="0 0 100 200"
      style={{ position: 'absolute', width: '13cqw', height: 'auto', opacity: 0.17, pointerEvents: 'none', transform: flip ? 'scaleX(-1)' : undefined, ...style }}
      aria-hidden="true"
    >
      <path d={`M${P0[0]} ${P0[1]}Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`} fill="none" stroke={color} strokeWidth="1.6" />
      {leaves.flatMap((t, i) => {
        const p = at(t)
        const size = 11 - i * 0.55
        return [-1, 1].map((side) => (
          <ellipse
            key={`${i}-${side}`}
            cx={p.x + side * 7}
            cy={p.y}
            rx={size * 0.42}
            ry={size}
            fill={color}
            transform={`rotate(${p.angle + 90 + side * 38} ${p.x + side * 7} ${p.y})`}
          />
        ))
      })}
    </svg>
  )
}

/** Gold award seal with a check mark and two ribbon tails in the primary colour. */
export function Seal({ id, ribbon, style }: { id: string; ribbon: string; style: CSSProperties }) {
  const points = Array.from({ length: 56 }, (_, i) => {
    const r = i % 2 === 0 ? 47 : 43.5
    const a = (i / 56) * Math.PI * 2
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 130" style={{ position: 'absolute', width: '11cqw', height: 'auto', pointerEvents: 'none', ...style }} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-g`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#f8dc86" />
          <stop offset="0.55" stopColor="#d9a93a" />
          <stop offset="1" stopColor="#a87a1c" />
        </radialGradient>
      </defs>
      <path d="M33 74L17 126L36 115L47 128L55 80Z" fill={ribbon} />
      <path d="M67 74L83 126L64 115L53 128L45 80Z" fill={ribbon} opacity="0.85" />
      <polygon points={points} fill={`url(#${id}-g)`} />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#f6e3a4" strokeWidth="1.6" opacity="0.9" />
      <circle cx="50" cy="50" r="30" fill="#e8c35e" opacity="0.5" />
      <path d="M34 51l11 11 22-24" fill="none" stroke="#7a5210" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
