import { Layout, Tooltip } from 'antd'
import { ChevronLeft } from 'lucide-react'
import { useSidebarCollapse } from '../sidebar/hooks/useSidebarCollapse'
import { NotificationBell } from './components/NotificationBell'
import { ProfileMenu } from './components/ProfileMenu'

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { collapsed, toggle } = useSidebarCollapse()
  return (
    <Layout.Header
      className="d-flex align-items-center justify-content-between gap-3 flex-shrink-0"
      style={{ height: 64, lineHeight: 'normal', padding: '0 24px', position: 'relative', background: '#fff', borderBottom: '1px solid #ede8f5' }}
    >
      <Tooltip
        placement="right"
        mouseEnterDelay={0.2}
        classNames={{ root: 'kv-tooltip' }}
        title={
          <span className="kv-tip-row">
            {collapsed ? 'Expand' : 'Collapse'}
            <span className="kv-tip-keys">
              <kbd>Ctrl</kbd>
              <kbd>B</kbd>
            </span>
          </span>
        }
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={!collapsed}
          className={`header-menu-toggle${collapsed ? ' is-collapsed' : ''}`}
        >
          <ChevronLeft size={16} strokeWidth={3} />
        </button>
      </Tooltip>
      <div className="d-flex align-items-center gap-3 min-w-0">
        <div className="min-w-0">
        <h1 className="font-display fw-bold mb-0 text-truncate" style={{ fontSize: 15, color: '#1a1228' }}>
          {title}
        </h1>
        <p className="mb-0 text-truncate" style={{ fontSize: 12, color: '#9b87b5' }}>
          {subtitle}
        </p>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3 flex-shrink-0">
        <NotificationBell />
        <ProfileMenu />
      </div>
    </Layout.Header>
  )
}
