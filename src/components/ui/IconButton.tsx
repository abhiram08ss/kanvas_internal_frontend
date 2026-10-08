import type { ReactNode } from 'react'
import { Button, Tooltip } from 'antd'

type Tone = 'blue' | 'amber' | 'green' | 'red' | 'slate' | 'purple'

const toneStyle: Record<Tone, { background: string; color: string }> = {
  blue: { background: '#eef2ff', color: '#4f46e5' },
  amber: { background: '#fef3c7', color: '#d97706' },
  green: { background: '#dcfce7', color: '#16a34a' },
  red: { background: '#fee2e2', color: '#dc2626' },
  slate: { background: '#f1f5f9', color: '#475569' },
  purple: { background: '#f6f4fd', color: '#5c2d91' },
}

/** A small tinted icon action for table rows (Ant Design Button + Tooltip). */
export function IconButton({
  icon,
  onClick,
  title,
  tone,
  disabled = false,
}: {
  icon: ReactNode
  onClick?: () => void
  title: string
  tone: Tone
  disabled?: boolean
}) {
  return (
    <Tooltip title={title}>
      <Button
        size="small"
        icon={icon}
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        style={{ width: 28, height: 28, border: 0, boxShadow: 'none', ...(disabled ? undefined : toneStyle[tone]) }}
      />
    </Tooltip>
  )
}
