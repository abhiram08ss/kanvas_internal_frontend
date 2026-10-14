import { Layout } from 'antd'
import { Link } from 'react-router-dom'
import { ChevronRight, Menu } from 'lucide-react'
import { useSidebarCollapse } from '../sidebar/hooks/useSidebarCollapse'
import { NotificationBell } from './components/NotificationBell'
import { ProfileMenu } from './components/ProfileMenu'

export interface Crumb {
  label: string
  to?: string
}

/** `crumbs` (e.g. Tenants > Create tenant) replaces the title + subtitle with a breadcrumb trail. */
export function PageHeader({ title, subtitle, crumbs }: { title: string; subtitle: string; crumbs?: Crumb[] }) {
  const { mobile, setDrawerOpen } = useSidebarCollapse()
  return (
    <Layout.Header
      className="app-header d-flex align-items-center justify-content-between gap-3 flex-shrink-0"
      style={{ height: 64, lineHeight: 'normal', position: 'relative', background: '#fff', borderBottom: '1px solid #ede8f5' }}
    >
      <div className="d-flex align-items-center gap-3 min-w-0">
        {mobile && (
          <button type="button" className="header-hamburger" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            <Menu size={20} />
          </button>
        )}
        {crumbs ? (
          <nav aria-label="Breadcrumb" className="d-flex align-items-center gap-2 min-w-0" style={{ fontSize: 14 }}>
            {crumbs.map((c, i) => (
              <span key={c.label} className="d-inline-flex align-items-center gap-2 text-nowrap">
                {i > 0 && <ChevronRight size={14} color="#9b87b5" />}
                {c.to ? (
                  <Link to={c.to} style={{ color: '#7b6b94', textDecoration: 'none' }}>{c.label}</Link>
                ) : (
                  <strong style={{ color: '#1a1228' }}>{c.label}</strong>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <div className="min-w-0">
          <h1 className="font-display fw-bold mb-0 text-truncate" style={{ fontSize: 15, color: '#1a1228' }}>
            {title}
          </h1>
          <p className="app-header-subtitle mb-0 text-truncate" style={{ fontSize: 12, color: '#9b87b5' }}>
            {subtitle}
          </p>
          </div>
        )}
      </div>

      <div className="d-flex align-items-center gap-3 flex-shrink-0">
        <NotificationBell />
        <ProfileMenu />
      </div>
    </Layout.Header>
  )
}
