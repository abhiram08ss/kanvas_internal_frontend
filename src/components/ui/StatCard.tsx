import type { ReactNode } from 'react'
import { Card } from 'antd'

type Tone = 'purple' | 'green' | 'amber' | 'red' | 'blue' | 'slate'

const toneRgb: Record<Tone, string> = {
  purple: '92, 45, 145',
  green: '22, 163, 74',
  amber: '217, 119, 6',
  red: '220, 38, 38',
  blue: '37, 99, 235',
  slate: '100, 116, 139',
}

/** A headline number with an icon (Ant Design Card). */
export function StatCard({ icon, label, value, hint, tone = 'purple' }: { icon: ReactNode; label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  const rgb = toneRgb[tone]

  return (
    <Card className="stat-card w-100" styles={{ body: { padding: '16px 24px' } }} style={{ borderRadius: 12, borderWidth: 1.5 }}>
      <div className="d-flex align-items-center gap-3">
        <div
          className="d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 46, height: 46, borderRadius: 10, background: `rgba(${rgb}, 0.082)`, color: `rgb(${rgb})` }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-truncate fw-semibold" style={{ color: '#9b87b5', fontSize: 11 }}>
            {label}
          </p>
          <p className="font-value fw-bold mb-0" style={{ color: '#1a1228', fontSize: 24, lineHeight: 1 }}>
            {value}
          </p>
          {hint && (
            <p className="mb-0" style={{ color: '#9b87b5', fontSize: 11, marginTop: 3 }}>
              {hint}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
