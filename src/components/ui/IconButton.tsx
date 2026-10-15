import type { ReactNode } from 'react'
import { Tooltip } from 'antd'

type Tone = 'blue' | 'amber' | 'green' | 'red' | 'slate' | 'purple' | 'neutral' | 'brand'

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
      <button type="button" className={`tenant-action is-${tone}`} onClick={onClick} disabled={disabled} aria-label={title}>
        {icon}
      </button>
    </Tooltip>
  )
}
