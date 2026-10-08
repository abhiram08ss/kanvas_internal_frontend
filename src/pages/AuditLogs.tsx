import { useEffect, useState } from 'react'
import { Building2, ClipboardList, Lock, Settings, Sparkles, Download } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ErrorBlock, LoadingBlock, Notice } from '../components/ui/State'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Toolbar } from '../components/ui/Toolbar'
import { Button } from 'antd'
import { api, errorMessage, type AuditCategory, type AuditLog } from '../api'
import { useApi } from '../api/useApi'

const PAGE_SIZE = 10

const categories: { key: AuditCategory; icon: typeof Building2 }[] = [
  { key: 'Tenant', icon: Building2 },
  { key: 'Plan', icon: ClipboardList },
  { key: 'Auth', icon: Lock },
  { key: 'Settings', icon: Settings },
  { key: 'Feature', icon: Sparkles },
]

const filterChips: ('All' | AuditCategory)[] = ['All', 'Tenant', 'Plan', 'Auth', 'Settings', 'Feature']

export default function AuditLogs() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filter, setFilter] = useState<(typeof filterChips)[number]>('All')
  const [page, setPage] = useState(1)
  const [exportError, setExportError] = useState('')

  // Wait for the user to stop typing before hitting the API, and go back to page 1 on any new search.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const { data, error, loading, reload } = useApi(
    () => api.auditLogs({ q: debouncedQuery, category: filter, page, pageSize: PAGE_SIZE }),
    [debouncedQuery, filter, page],
  )

  const firstShown = data && data.total > 0 ? (data.page - 1) * PAGE_SIZE + 1 : 0
  const lastShown = data ? (data.page - 1) * PAGE_SIZE + data.items.length : 0

  const exportCsv = async () => {
    setExportError('')
    try {
      await api.exportAuditLogs({ q: debouncedQuery, category: filter })
    } catch (e) {
      setExportError(errorMessage(e))
    }
  }

  return (
    <AppLayout title="Audit Logs" subtitle="Governance trail — tenant changes, plan updates, configuration events">
      <div className="row row-cols-2 row-cols-sm-5 g-3">
        {categories.map(({ key, icon: Icon }) => (
          <div key={key} className="col">
            <Card className="d-flex flex-column align-items-center gap-2 p-4 text-center">
              <div className="d-flex align-items-center justify-content-center rounded-2 bg-primary-subtle text-primary" style={{ width: 44, height: 44 }}>
                <Icon size={20} />
              </div>
              <p className="font-display fs-4 fw-bold text-dark mb-0">{data?.categoryCounts[key] ?? '–'}</p>
              <p className="text-secondary mb-0" style={{ fontSize: 12 }}>
                {key}
              </p>
            </Card>
          </div>
        ))}
      </div>

      <div className="mt-3">
        {exportError && (
          <Notice tone="error" onDismiss={() => setExportError('')}>
            {exportError}
          </Notice>
        )}
      </div>

      <ListCard className="mt-3">
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search logs..."
          filters={filterChips}
          activeFilter={filter}
          onFilterChange={(c) => {
            setFilter(c)
            setPage(1)
          }}
          extra={
            <Button icon={<Download size={14} />} onClick={() => void exportCsv()}>
              Export
            </Button>
          }
        />
        {loading && !data ? (
          <LoadingBlock />
        ) : error || !data ? (
          <ErrorBlock message={error ?? 'No data'} onRetry={reload} />
        ) : (
          <DataTable<AuditLog>
            rowKey="id"
            dataSource={data.items}
            locale={{ emptyText: 'No log entries match your filters.' }}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: data.total,
              showSizeChanger: false,
              hideOnSinglePage: true,
              onChange: setPage,
              showTotal: () => `Showing ${firstShown}–${lastShown} of ${data.total}`,
            }}
            columns={[
              {
                title: 'Date & Time',
                dataIndex: 'date',
                render: (d: string) => (
                  <span className="text-nowrap" style={{ color: '#9b87b5' }}>
                    {d}
                  </span>
                ),
              },
              { title: 'Action', dataIndex: 'action', render: (a: string) => <span className="fw-semibold">{a}</span> },
              { title: 'Category', dataIndex: 'category', render: (c: string) => <Badge tone="purple">{c}</Badge> },
              { title: 'Performed By', dataIndex: 'performedBy' },
              { title: 'Details', dataIndex: 'details', render: (d: string) => <span style={{ color: '#9b87b5' }}>{d}</span> },
              { title: 'IP Address', dataIndex: 'ip', render: (ip: string) => <span style={{ color: '#9b87b5' }}>{ip}</span> },
            ]}
          />
        )}
      </ListCard>
    </AppLayout>
  )
}
