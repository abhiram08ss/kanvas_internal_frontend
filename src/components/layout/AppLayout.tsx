import type { ReactNode } from 'react'
import { Layout } from 'antd'
import { Sidebar } from '../sidebar/Sidebar'
import { PageHeader } from '../header/PageHeader'
import { ErrorBlock, LoadingBlock } from '../ui/State'
import { useData } from '../../context/DataContext'

export function AppLayout({ title, subtitle, header, children }: { title: string; subtitle: string; header?: ReactNode; children: ReactNode }) {
  const { loading, error, refresh } = useData()

  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar />
      <Layout className="min-w-0">
        {header ?? <PageHeader title={title} subtitle={subtitle} />}
        <Layout.Content className="scrollbar-thin" style={{ overflowY: 'auto', padding: 24 }}>
          {loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={() => void refresh()} /> : children}
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
