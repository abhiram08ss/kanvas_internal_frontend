import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import { ChevronLeft, LayoutDashboard, Building2, ClipboardCheck, FileText, Users, FileClock } from 'lucide-react'
import { useSidebarCollapse } from './hooks/useSidebarCollapse'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenants', label: 'Tenants', icon: Building2 },
  // '/courses' (the standalone Courses page) is intentionally not linked here - course management now
  // lives in LMS Course Content's own Courses tab instead. The route/page itself still exists (unlinked,
  // not deleted), so nothing that already points at it (a bookmark, a direct URL) breaks.
  { to: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { to: '/lms-content', label: 'LMS Course Content', icon: FileText },
  // '/course-categories' is intentionally not linked here either, same reasoning as '/courses' above -
  // the route/page still exists (unlinked, not deleted).
  // The rest are platform/billing-operations screens - a Content User only ever works the 4 items above.
  // '/subscription' is intentionally not linked here - the route/page still exists (unlinked, not deleted).
  // '/usage-analytics' is intentionally not linked here - the route/page still exists (unlinked, not deleted).
  { to: '/platform-users', label: 'Platform Users', icon: Users, superOnly: true },
  { to: '/audit-logs', label: 'Audit Logs', icon: FileClock, superOnly: true },
]

export function Sidebar() {
  const { collapsed: desktopCollapsed, toggle, mobile, drawerOpen, setDrawerOpen } = useSidebarCollapse()
  // On a phone the sidebar is a full-width-labels drawer, never the icon-only strip.
  const collapsed = mobile ? false : desktopCollapsed

  // Ctrl/Cmd + B opens and closes the sidebar, like most editors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])
  const { pathname } = useLocation()
  // Close the drawer after navigating.
  useEffect(() => setDrawerOpen(false), [pathname, setDrawerOpen])
  const { user } = useAuth()
  const isSuper = user?.role === 'Super Admin'
  const items = navItems.filter((item) => isSuper || !item.superOnly)
  const selected = items.find(({ to }) => (to === '/' ? pathname === '/' : pathname.startsWith(to)))?.to

  return (
    <>
    {mobile && <div className={`sidebar-backdrop${drawerOpen ? ' is-open' : ''}`} onClick={() => setDrawerOpen(false)} />}
    <Layout.Sider
      className={mobile ? `sidebar-drawer${drawerOpen ? ' is-open' : ''}` : undefined}
      theme="light"
      width={224}
      collapsedWidth={72}
      collapsed={collapsed}
      trigger={null}
      style={{ height: '100vh', borderRight: '1px solid #ede8f5' }}
      styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%' } }}
    >
      <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ minHeight: 56, borderBottom: '1px solid #ede8f5' }}>
        {collapsed ? (
          <span className="font-display fs-4 fw-bold text-primary">K</span>
        ) : (
          <img src="/kanvas-logo.png" alt="Kanvas" style={{ height: 28, objectFit: 'contain' }} />
        )}
      </div>

      <Menu
        mode="inline"
        className="flex-grow-1 scrollbar-thin app-menu"
        style={{ overflowY: 'auto', padding: '12px 8px', borderInlineEnd: 0 }}
        selectedKeys={selected ? [selected] : []}
        items={items.map(({ to, label, icon: Icon }) => ({ key: to, icon: <Icon size={16} />, label: <Link to={to}>{label}</Link> }))}
      />

        {!mobile && (
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={!collapsed}
          className={`sidebar-edge-toggle${collapsed ? ' is-collapsed' : ''}`}
        >
          <ChevronLeft size={13} strokeWidth={3} />
        </button>
        )}

      <div className="sidebar-brand-light flex-shrink-0">
        {collapsed ? (
          <span>© 2026</span>
        ) : (
          <>
            Powered by <strong>Kan Associations</strong> <span className="sidebar-brand-year">© 2026</span>
          </>
        )}
      </div>
    </Layout.Sider>
    </>
  )
}
