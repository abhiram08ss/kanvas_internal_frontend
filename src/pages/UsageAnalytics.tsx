import { Users, ShieldCheck, PieChart as PieIcon, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { Card } from '../components/ui/Card'
import { ErrorBlock, LoadingBlock } from '../components/ui/State'
import { Progress } from 'antd'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { api, type UsageData } from '../api'
import { useApi } from '../api/useApi'

export default function UsageAnalytics() {
  const { data, error, loading, reload } = useApi(api.usage)

  return (
    <AppLayout title="Usage & Analytics" subtitle="Monitor user quota consumption across all tenants">
      {loading && !data ? <LoadingBlock /> : error || !data ? <ErrorBlock message={error ?? 'No data'} onRetry={reload} /> : <UsageBody data={data} />}
    </AppLayout>
  )
}

function UsageBody({ data }: { data: UsageData }) {
  const { summary, byTenant, chart, userTrend } = data

  return (
    <>
      <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
        <div className="col">
          <StatCard
            icon={<Users size={20} />}
            label="Total Active Users"
            value={summary.totalActiveUsers}
            hint={`of ${summary.licensedCapacity} licensed`}
            tone="purple"
          />
        </div>
        <div className="col">
          <StatCard icon={<ShieldCheck size={20} />} label="Available Capacity" value={summary.availableCapacity} hint="unused licenses" tone="green" />
        </div>
        <div className="col">
          <StatCard icon={<PieIcon size={20} />} label="Overall Utilization" value={`${summary.utilizationPercent}%`} hint="of total quota" tone="blue" />
        </div>
        <div className="col">
          <StatCard
            icon={<AlertTriangle size={20} />}
            label="Near Capacity (≥90%)"
            value={summary.nearCapacityCount}
            hint="tenants need attention"
            tone="red"
          />
        </div>
      </div>

      <div className="mt-4 row row-cols-1 row-cols-lg-2 g-4">
        <div className="col">
          <Card className="p-4 h-100">
            <h3 className="mb-3 font-display fs-6 fw-bold text-dark">Usage by Tenant</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                <XAxis dataKey="tenant" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="used" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                <Bar dataKey="limit" fill="#e5d9fb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="col">
          <Card className="p-4 h-100">
            <h3 className="mb-3 font-display fs-6 fw-bold text-dark">Platform User Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={userTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      <ListCard className="mt-4">
        <DataTable<UsageData['byTenant'][number]>
          rowKey="tenantId"
          dataSource={byTenant}
          locale={{ emptyText: 'No tenant usage to show yet.' }}
          columns={[
            { title: 'Tenant', dataIndex: 'tenant', render: (t: string) => <span className="tenant-name">{t}</span> },
            { title: 'Active Users', width: 140, dataIndex: 'activeUsers' },
            { title: 'Limit', width: 130, key: 'limit', render: (_: unknown, row) => (row.unlimited ? 'Unlimited' : row.limit) },
            { title: 'Available', width: 130, dataIndex: 'available', render: (a: number | null) => a ?? '—' },
            {
              title: 'Utilization', width: 220,
              key: 'utilization',
              render: (_: unknown, row) =>
                row.unlimited ? (
                  <span style={{ fontSize: 12, color: '#9b87b5' }}>n/a</span>
                ) : (
                  <div className="d-flex align-items-center gap-2" style={{ minWidth: 150 }}>
                    <Progress
                      percent={Math.min(row.utilization, 100)}
                      showInfo={false}
                      size="small"
                      strokeColor={row.utilization >= 90 ? '#dc2626' : '#5c2d91'}
                      style={{ width: 96, margin: 0 }}
                    />
                    <span className="fw-semibold" style={{ fontSize: 12, color: '#7b6b94' }}>
                      {row.utilization}%
                    </span>
                  </div>
                ),
            },
          ]}
        />
      </ListCard>
    </>
  )
}
