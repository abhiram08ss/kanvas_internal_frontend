import './SplashScreen.css'

/** Full-screen app launch splash: spinning ring around the K tile, white wordmark, sliding progress bar. */
export function SplashScreen({ label = 'Preparing your workspace…' }: { label?: string }) {
  return (
    <div className="splash" role="status" aria-live="polite" aria-label={label}>
      <div className="splash-center">
        <div className="splash-mark">
          <span className="splash-ring" />
          <span className="splash-tile">K</span>
        </div>
        <img className="splash-logo" src="/kanvas-logo-white.png" alt="Kanvas" />
        <p className="splash-label">{label}</p>
        <div className="splash-bar"><i /></div>
      </div>
      <p className="splash-foot">Powered by <strong>kanassociates</strong> © 2026</p>
    </div>
  )
}
