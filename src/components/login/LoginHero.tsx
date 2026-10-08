import './LoginHero.css'

export function LoginHero() {
  return (
    <div className="login-hero">
      <ConstellationGraphic />

      <div className="login-hero-top">
        <img src="/kanvas-logo-white.png" alt="Kanvas" className="login-hero-logo" />
        <p className="login-hero-tagline">Super Admin Control Panel</p>
      </div>

      <div className="login-hero-mid">
        <h2 className="login-hero-title">
          One Platform.
          <br />
          Many Organizations.
        </h2>
        {/* <p className="login-hero-desc">Manage tenants, plans, feature entitlements, and platform health from a single, powerful control panel.</p> */}
        {/* 
        <div className="login-hero-list">
          {highlights.map((label) => (
            <div key={label} className="login-hero-item">
              <span className="login-hero-check">
                <Check size={12} strokeWidth={2.5} />
              </span>
              {label}
            </div>
          ))}
        </div> */}
      </div>

      <p className="login-hero-footer">© 2026 Kanvas LMS. All rights reserved.</p>
    </div>
  )
}

type IconKind = 'flag' | 'bars' | 'wave' | 'check' | 'star' | 'target' | 'bolt' | 'signal'

/** Small hand-drawn glyphs, each centered on its own origin so a node can just translate() into place. */
function OrbitGlyph({ kind }: { kind: IconKind }) {
  switch (kind) {
    case 'flag':
      return (
        <>
          <polygon points="0,-8 14,-3 0,2 -14,-3" fill="white" opacity={0.9} />
          <line x1="0" y1="2" x2="0" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.8} />
        </>
      )
    case 'bars':
      return (
        <>
          <rect x="-7" y="-5" width="4" height="10" rx="1" fill="white" opacity={0.9} />
          <rect x="-2" y="-9" width="4" height="14" rx="1" fill="white" opacity={0.9} />
          <rect x="3" y="-7" width="4" height="12" rx="1" fill="white" opacity={0.9} />
        </>
      )
    case 'wave':
      return (
        <>
          <circle cx="0" cy="-7" r="5" fill="white" opacity={0.9} />
          <path d="M-9,6 Q0,1 9,6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.9} />
        </>
      )
    case 'check':
      return <path d="M-7,0 l5,5 l10,-10" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
    case 'star':
      return <path d="M0,-10 l2.6,8h8.4l-6.8,5 2.6,8-6.8,-5-6.8,5 2.6,-8-6.8,-5h8.4z" fill="white" opacity={0.9} />
    case 'target':
      return (
        <>
          <circle r="5" stroke="white" strokeWidth="2" opacity={0.9} />
          <circle r="9" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" opacity={0.7} />
        </>
      )
    case 'bolt':
      return <path d="M4,-10 l-8,12h6l-2,10 8,-13h-6z" fill="white" opacity={0.9} />
    case 'signal':
      return (
        <>
          <path d="M-7,3 Q0,-5 7,3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.6} />
          <path d="M-11,7 Q0,-9 11,7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.4} />
          <circle cy="6" r="2.5" fill="white" opacity={0.9} />
        </>
      )
  }
}

function OrbitNode({ x, y, kind, haloR, opacity = 0.9 }: { x: number; y: number; kind: IconKind; haloR: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <circle r={haloR} stroke="white" strokeWidth="1" opacity={0.35} />
      <circle r={haloR * 0.62} fill="white" opacity={0.15} />
      <OrbitGlyph kind={kind} />
    </g>
  )
}

/**
 * An orbital system, not a static icon collage: three rings spin independently
 * (outer/inner clockwise, mid counter-clockwise) so the piece has real depth,
 * around a hub that pulses on its own cycle. Each node carries a small hand-drawn
 * glyph (chart, flag, star, check, bolt...) rather than being a bare dot.
 */
function ConstellationGraphic() {
  return (
    <svg viewBox="0 0 560 560" fill="none" xmlns="http://www.w3.org/2000/svg" className="login-hero-graphic">
      {/* distant static twinkle points */}
      <circle className="login-hero-twinkle t1" cx="90" cy="120" r="2.5" fill="white" />
      <circle className="login-hero-twinkle t2" cx="500" cy="150" r="2" fill="white" />
      <circle className="login-hero-twinkle t3" cx="480" cy="470" r="3" fill="white" />
      <circle className="login-hero-twinkle t4" cx="70" cy="440" r="2" fill="white" />
      <circle className="login-hero-twinkle t5" cx="300" cy="40" r="2" fill="white" />
      <circle className="login-hero-twinkle t1" cx="520" cy="320" r="2.5" fill="white" />

      {/* outer ring — slow clockwise */}
      <g className="login-hero-ring login-hero-ring-outer">
        <circle cx="280" cy="280" r="235" stroke="white" strokeWidth="1" strokeDasharray="2 14" opacity={0.5} />
        <line x1="280" y1="280" x2="486.7" y2="355.3" stroke="white" strokeWidth="1" opacity={0.25} />
        <line x1="280" y1="280" x2="89.5" y2="390" stroke="white" strokeWidth="1" opacity={0.2} />
        <OrbitNode x={486.7} y={355.3} kind="bars" haloR={16} />
        <OrbitNode x={260.8} y={499.2} kind="star" haloR={14} opacity={0.75} />
        <OrbitNode x={89.5} y={390} kind="target" haloR={16} />
        <OrbitNode x={89.5} y={170} kind="signal" haloR={14} opacity={0.65} />
        <OrbitNode x={299.2} y={60.8} kind="flag" haloR={15} opacity={0.85} />
        <OrbitNode x={470.5} y={170} kind="bolt" haloR={14} opacity={0.7} />
      </g>

      {/* mid ring — counter-clockwise */}
      <g className="login-hero-ring login-hero-ring-mid">
        <circle cx="280" cy="280" r="150" stroke="white" strokeWidth="1" strokeDasharray="5 9" opacity={0.55} />
        <line x1="280" y1="280" x2="280" y2="425" stroke="white" strokeWidth="1" opacity={0.25} />
        <OrbitNode x={422.8} y={305.2} kind="check" haloR={13} opacity={0.8} />
        <OrbitNode x={280} y={425} kind="wave" haloR={15} opacity={0.85} />
        <OrbitNode x={143.7} y={329.6} kind="bolt" haloR={11} opacity={0.6} />
        <OrbitNode x={196.8} y={161.2} kind="bars" haloR={12} opacity={0.75} />
        <OrbitNode x={352.5} y={155.4} kind="star" haloR={12} opacity={0.7} />
      </g>

      {/* inner ring — fast clockwise */}
      <g className="login-hero-ring login-hero-ring-inner">
        <circle cx="280" cy="280" r="85" stroke="white" strokeWidth="1.25" opacity={0.4} />
        <circle cx="340.1" cy="340.1" r="4" fill="white" opacity={0.8} />
        <circle cx="219.9" cy="340.1" r="3" fill="white" opacity={0.6} />
        <circle cx="219.9" cy="219.9" r="4" fill="white" opacity={0.8} />
        <circle cx="340.1" cy="219.9" r="3" fill="white" opacity={0.6} />
      </g>

      {/* hub — pulses independently of the rotation, carries the book mark */}
      <g className="login-hero-hub">
        <circle cx="280" cy="280" r="58" fill="white" opacity={0.06} />
        <circle cx="280" cy="280" r="42" fill="white" opacity={0.1} />
        <circle cx="280" cy="280" r="27" stroke="white" strokeWidth="1.5" opacity={0.55} />
        <circle cx="280" cy="280" r="19" fill="white" opacity={0.22} />
        <path d="M264,270 Q280,262 296,270 L296,294 Q280,288 264,294 Z" fill="white" opacity={0.85} />
        <line x1="280" y1="270" x2="280" y2="294" stroke="white" strokeWidth="1.5" opacity={0.6} />
      </g>
    </svg>
  )
}
