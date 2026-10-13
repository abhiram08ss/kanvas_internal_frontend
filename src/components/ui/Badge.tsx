import type { ReactNode } from 'react'
import { Tag } from 'antd'

type Tone = 'green' | 'amber' | 'red' | 'purple' | 'blue' | 'slate'

const toneStyle: Record<Tone, { background: string; color: string }> = {
  green: { background: '#dcfce7', color: '#16a34a' },
  amber: { background: '#fef3c7', color: '#d97706' },
  red: { background: '#fee2e2', color: '#dc2626' },
  purple: { background: '#f0e8fa', color: '#5c2d91' },
  blue: { background: '#e0f2fe', color: '#0369a1' },
  slate: { background: '#f1f5f9', color: '#475569' },
}

const statusTone: Record<string, Tone> = {
  Active: 'green',
  Healthy: 'green',
  Success: 'green',
  Resolved: 'green',
  Suspended: 'amber',
  Pending: 'amber',
  Degraded: 'amber',
  Ongoing: 'amber',
  Expired: 'red',
  Failed: 'red',
  Inactive: 'slate',
}

/** A status/type pill (Ant Design Tag). Pass `tone`, or let common status words pick their own colour. */
export function Badge({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const resolvedTone = tone ?? statusTone[String(children)] ?? 'slate'
  // Status words (Active, Suspended, ...) render as the dot pill used across the tables.
  if (!tone && statusTone[String(children)]) {
    return (
      <span className={`tenant-status is-${resolvedTone}`}>
        <span className="dot" />
        {children}
      </span>
    )
  }
  return (
    <Tag variant="filled" style={{ ...toneStyle[resolvedTone], borderRadius: 999, fontWeight: 600, fontSize: 11, margin: 0, paddingInline: 10 }}>
      {children}
    </Tag>
  )
}
