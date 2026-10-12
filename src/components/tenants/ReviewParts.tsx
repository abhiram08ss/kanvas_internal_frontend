import type { ReactNode } from 'react'
import '../../pages/CreateTenant.css'

export function ReviewCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="ct-review-card">
      <div className="ct-review-card-head">
        <span className="ct-review-icon">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="ct-review-card-body">{children}</div>
    </div>
  )
}

export function ReviewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="ct-review-row">
      <span className="ct-review-label">{label}</span>
      <span className={`ct-review-value${value ? '' : ' is-empty'}`} style={mono ? { fontFamily: 'monospace' } : undefined}>
        {value || 'Not provided'}
      </span>
    </div>
  )
}
