import type { ReactNode } from 'react'
import { Layout } from 'antd'
import { Sidebar } from '../sidebar/Sidebar'
import { PageHeader, type Crumb } from '../header/PageHeader'
import { ErrorBlock, LoadingBlock } from '../ui/State'
import { useData } from '../../context/DataContext'

export function AppLayout({ title, subtitle, crumbs, header, children }: { title: string; subtitle: string; crumbs?: Crumb[]; header?: ReactNode; children: ReactNode }) {
  const { loading, error, refresh } = useData()

  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar />
      <Layout className="min-w-0">
        {header ?? <PageHeader title={title} subtitle={subtitle} crumbs={crumbs} />}
        <Layout.Content className="app-content scrollbar-thin" style={{ overflowY: 'auto' }}>
          {loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={() => void refresh()} /> : children}
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
