import type { CSSProperties, ReactNode } from 'react'
import { Card as AntCard } from 'antd'

/** Ant Design card with no built-in body padding; spacing comes from the caller's className (e.g. `p-4`). */
export function Card({ className = '', style, children }: { className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <AntCard className={className} style={{ borderRadius: 14, ...style }} styles={{ body: { padding: 0, height: '100%', overflow: 'hidden' } }}>
      {children}
    </AntCard>
  )
}
