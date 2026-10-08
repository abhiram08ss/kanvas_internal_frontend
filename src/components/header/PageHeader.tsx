import { Layout } from 'antd'
import { SearchBox } from './components/SearchBox'
import { NotificationBell } from './components/NotificationBell'
import { ProfileMenu } from './components/ProfileMenu'

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Layout.Header
      className="d-flex align-items-center justify-content-between gap-3 flex-shrink-0"
      style={{ height: 64, lineHeight: 'normal', padding: '0 24px', background: '#fff', borderBottom: '1px solid #ede8f5' }}
    >
      <div className="min-w-0">
        <h1 className="font-display fw-bold mb-0 text-truncate" style={{ fontSize: 15, color: '#1a1228' }}>
          {title}
        </h1>
        <p className="mb-0 text-truncate" style={{ fontSize: 12, color: '#9b87b5' }}>
          {subtitle}
        </p>
      </div>

      <div className="d-flex align-items-center gap-3 flex-shrink-0">
        <SearchBox />
        <NotificationBell />
        <ProfileMenu />
      </div>
    </Layout.Header>
  )
}
