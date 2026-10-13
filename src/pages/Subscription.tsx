import { useState } from 'react'
import { CheckCircle2, PauseCircle, Clock } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Toolbar } from '../components/ui/Toolbar'
import { useData, useDataNeeds } from '../context/DataContext'
import type { Subscription as SubscriptionRow } from '../api'

export default function Subscription() {
  const { subscriptions } = useData()
  useDataNeeds('subscriptions')
  const [query, setQuery] = useState('')
  const rows = subscriptions.filter((s) => s.tenant.toLowerCase().includes(query.toLowerCase()))

  return (
    <AppLayout title="Subscription" subtitle="Manage commercial state for all tenant subscriptions">
      <div className="row row-cols-1 row-cols-sm-3 g-3">
        <div className="col">
          <StatCard icon={<CheckCircle2 size={20} />} label="Active" value={subscriptions.filter((s) => s.status === 'Active').length} tone="green" />
        </div>
        <div className="col">
          <StatCard icon={<PauseCircle size={20} />} label="Suspended" value={subscriptions.filter((s) => s.status === 'Suspended').length} tone="amber" />
        </div>
        <div className="col">
          <StatCard icon={<Clock size={20} />} label="Expired" value={subscriptions.filter((s) => s.status === 'Expired').length} tone="red" />
        </div>
      </div>

      <ListCard className="mt-4">
        <Toolbar query={query} onQueryChange={setQuery} searchPlaceholder="Search tenants..." />
        <DataTable<SubscriptionRow>
          rowKey="tenant"
          dataSource={rows}
          locale={{ emptyText: 'No subscriptions match your search.' }}
          columns={[
            { title: 'Tenant', dataIndex: 'tenant', render: (t: string) => <span className="tenant-name">{t}</span> },
            { title: 'Plan', width: 160, dataIndex: 'plan' },
            { title: 'Status', width: 130, dataIndex: 'status', render: (status: SubscriptionRow['status']) => <Badge>{status}</Badge> },
            { title: 'Start Date', width: 150, dataIndex: 'startDate', render: (d: string) => <span className="tenant-muted">{d}</span> },
            { title: 'Renewal Date', width: 150, dataIndex: 'renewalDate', render: (d: string) => <span className="tenant-muted">{d}</span> },
          ]}
        />
      </ListCard>
    </AppLayout>
  )
}
