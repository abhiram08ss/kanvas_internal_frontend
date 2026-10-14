import { useEffect, useState } from 'react'
import { Building2, ClipboardList, Lock, Settings, Sparkles, Download } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ErrorBlock, LoadingBlock, Notice } from '../components/ui/State'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { useFitRows } from '../components/ui/useFitRows'
import { Toolbar } from '../components/ui/Toolbar'
import { Button, DatePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { api, errorMessage, type AuditCategory, type AuditLog } from '../api'
import { useApi } from '../api/useApi'

const DEFAULT_DAYS = 90
const DATE_FMT = 'YYYY-MM-DD'

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
  // Rows per page follow the window height so the page itself never scrolls (as on the other list pages).
  const PAGE_SIZE = useFitRows(500)
  useEffect(() => setPage(1), [PAGE_SIZE])
  // Date range of the entries shown; starts as the last 90 days (today included, so 89 days back).
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(DEFAULT_DAYS - 1, 'day'), dayjs()])
  const from = range[0].format(DATE_FMT)
  const to = range[1].format(DATE_FMT)
  const spanDays = range[1].diff(range[0], 'day') + 1 // both end days count
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
    () => api.auditLogs({ q: debouncedQuery, category: filter, page, pageSize: PAGE_SIZE, from, to }),
    [debouncedQuery, filter, page, from, to, PAGE_SIZE],
  )

  const firstShown = data && data.total > 0 ? (data.page - 1) * PAGE_SIZE + 1 : 0
  const lastShown = data ? (data.page - 1) * PAGE_SIZE + data.items.length : 0

  const exportCsv = async () => {
    setExportError('')
    try {
      await api.exportAuditLogs({ q: debouncedQuery, category: filter, from, to })
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
            <div className="d-flex align-items-center gap-2">
              <span className="audit-duration">
                {spanDays} {spanDays === 1 ? 'day' : 'days'}
              </span>
              <DatePicker.RangePicker
                allowClear={false}
                value={range}
                format="DD MMM YYYY"
                // No future dates; and once a start date is picked, the end date can't be before it.
                disabledDate={(d, info) => d.isAfter(dayjs(), 'day') || (!!info.from && d.isBefore(info.from, 'day'))}
                presets={[
                  { label: 'Last 7 days', value: [dayjs().subtract(6, 'day'), dayjs()] },
                  { label: 'Last 30 days', value: [dayjs().subtract(29, 'day'), dayjs()] },
                  { label: 'Last 90 days', value: [dayjs().subtract(DEFAULT_DAYS - 1, 'day'), dayjs()] },
                  { label: 'Last 12 months', value: [dayjs().subtract(12, 'month'), dayjs()] },
                ]}
                onChange={(v) => {
                  if (v?.[0] && v[1]) {
                    setRange([v[0], v[1]])
                    setPage(1)
                  }
                }}
              />
              <Button icon={<Download size={14} />} onClick={() => void exportCsv()}>
                Export
              </Button>
            </div>
          }
        />
        {loading && !data ? (
          <LoadingBlock />
        ) : error || !data ? (
          <ErrorBlock message={error ?? 'No data'} onRetry={reload} />
        ) : (
          <DataTable<AuditLog>
            serial={false}
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
                title: 'Date & Time', width: 190,
                dataIndex: 'date',
                render: (d: string) => (
                  <span className="text-nowrap tenant-muted">
                    {d}
                  </span>
                ),
              },
              { title: 'Action', width: 220, dataIndex: 'action', render: (a: string) => <span>{a}</span> },
              { title: 'Category', width: 130, dataIndex: 'category', render: (c: string) => <Badge tone="purple">{c}</Badge> },
              { title: 'Performed By', width: 210, dataIndex: 'performedBy' },
              { title: 'Details', dataIndex: 'details', render: (d: string) => <span style={{ color: '#727587' }}>{d}</span> },
              { title: 'IP Address', width: 140, dataIndex: 'ip', render: (ip: string) => <span className="tenant-muted">{ip}</span> },
            ]}
          />
        )}
      </ListCard>
    </AppLayout>
  )
}
