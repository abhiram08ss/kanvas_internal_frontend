import type { ReactNode } from 'react'
import './PillUI.css'

/** The rounded bordered card every list lives in: toolbar on top, table below, one shared border. */
export function ListCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`pill-card list-card bg-white shadow-sm ${className}`}>{children}</div>
}
