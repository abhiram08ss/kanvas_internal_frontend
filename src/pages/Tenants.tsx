import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, CheckCircle2, PauseCircle, Eye, PenLine, RefreshCw } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Tabs } from '../components/ui/Tabs'
import { useFitRows } from '../components/ui/useFitRows'
import { ProvisioningPanel } from './Provisioning'
import { StatCard } from '../components/ui/StatCard'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Badge } from '../components/ui/Badge'
import { IconButton } from '../components/ui/IconButton'
import { Toolbar } from '../components/ui/Toolbar'
import { ChangePlanModal } from '../components/tenants/ChangePlanModal'
import { TenantDetailsModal } from '../components/tenants/TenantDetailsModal'
import { useData, useDataNeeds } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import type { Tenant } from '../api'

const tenantFilters = ['All', 'Active', 'Suspended'] as const
const UNLIMITED = 999_999

export default function Tenants() {
  const { user } = useAuth()
  const canManage = user?.role === 'Super Admin'
  const { tenants, plans, refresh } = useData()
  useDataNeeds('tenants', 'plans', 'courses')
  // The users column is the tenant's live active-user count, which changes in the LMS while this list stays cached:
  // refetch it quietly each time the page opens (a first load is already in flight, which refresh skips).
  useEffect(() => {
    void refresh(['tenants'])
  }, [refresh])
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const pageSize = useFitRows(canManage ? 470 : 400)
  // Provisioning (Super Admin only) lives here as a tab: /tenants?tab=provisioning
  const tab = canManage && params.get('tab') === 'provisioning' ? 'Provisioning' : 'Tenants'
  const setTab = (t: string) => setParams(t === 'Provisioning' ? { tab: 'provisioning' } : {}, { replace: true })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof tenantFilters)[number]>('All')
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null)
  const [planTenant, setPlanTenant] = useState<Tenant | null>(null)

  const rows = useMemo(
    () =>
      [...tenants].sort((x, y) => y.id - x.id).filter((t) => { // newest first
        // Search by name or code; surrounding spaces never break a match.
        const needle = query.trim().toLowerCase()
        const matchesQuery = !needle || (t.name ?? '').toLowerCase().includes(needle) || (t.code ?? '').toLowerCase().includes(needle)
        const matchesFilter = filter === 'All' || t.status === filter
        return matchesQuery && matchesFilter
      }),
    [tenants, query, filter],
  )

  return (
    <AppLayout title="Tenants" subtitle="Create and manage all LMS tenant organisations">
      {canManage && <Tabs variant="pill" tabs={['Tenants', 'Provisioning']} active={tab} onChange={setTab} icons={{ Tenants: <Building2 size={15} />, Provisioning: <RefreshCw size={15} /> }} />}
      {tab === 'Provisioning' ? (
        <ProvisioningPanel />
      ) : (
        <>
      <div className="row row-cols-2 row-cols-lg-3 g-3">
        <div className="col">
          <StatCard icon={<Building2 size={20} />} label="Total Tenants" value={tenants.length} hint="All registered organizations" tone="purple" />
        </div>
        <div className="col">
          <StatCard icon={<CheckCircle2 size={20} />} label="Active Tenants" value={tenants.filter((t) => t.status === 'Active').length} hint="Currently active" tone="green" />
        </div>
        <div className="col">
          <StatCard icon={<PauseCircle size={20} />} label="Suspended Tenants" value={tenants.filter((t) => t.status === 'Suspended').length} hint="Temporarily suspended" tone="amber" />
        </div>
      </div>

      <ListCard className="mt-4">
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search by name or code"
          filters={tenantFilters}
          activeFilter={filter}
          onFilterChange={setFilter}
          newLabel={canManage ? 'New Tenant' : undefined}
          onNew={canManage ? () => navigate('/tenants/new') : undefined}
        />
        <DataTable<Tenant>
          // A new search or filter always starts again at page 1 (never an empty page 3 of a short list).
          key={`${filter}|${query.trim()}`}
          serial={false}
          rowKey="id"
          pageSize={pageSize}
          // Fixed layout + set widths: columns keep their size when a filter tab changes the rows, so the header never shifts.
          tableLayout="fixed"
          scroll={{ x: 960 }}
          dataSource={rows}
          locale={{ emptyText: tenants.length === 0 ? 'No tenants yet. Create the first one with New Tenant.' : 'No tenants match your search or filter.' }}
          columns={[
            { title: 'Tenant Name', dataIndex: 'name', width: 200, ellipsis: true, render: (name: string) => <span>{name}</span> },
            {
              title: 'Users / Limit',
              width: 220,
              key: 'users',
              render: (_: unknown, t) => {
                const unlimited = t.userLimit >= UNLIMITED
                // A limit of 0 (or a missing one) must not divide by zero; over-limit tenants show a full bar.
                const percent = unlimited || !(t.userLimit > 0) ? (t.users > 0 && !unlimited ? 100 : 0) : Math.min(100, Math.round((t.users / t.userLimit) * 100))
                const hot = !unlimited && percent >= 90
                return (
                  <div className="tenant-usage">
                    <div className="d-flex justify-content-between align-items-baseline">
                      <span className={hot ? 'is-hot' : ''}>
                        <strong>{t.users ?? 0}</strong> / {unlimited ? '∞' : (t.userLimit ?? 0)}
                      </span>
                      {!unlimited && <span className={`tenant-usage-pct${hot ? ' is-hot' : ''}`}>{percent}%</span>}
                    </div>
                    {!unlimited && (
                      <div className="tenant-bar">
                        <div className={`tenant-bar-fill${hot ? ' is-hot' : ''}`} style={{ width: `${percent}%` }} />
                      </div>
                    )}
                  </div>
                )
              },
            },
            { title: 'Status', dataIndex: 'status', width: 130, render: (status: Tenant['status']) => <Badge>{status}</Badge> },
            { title: 'Created On', dataIndex: 'createdOn', width: 140, render: (d: string) => <span className="tenant-muted">{d || '—'}</span> },
            { title: 'Courses', dataIndex: 'courseCount', width: 90, className: 'col-center', render: (n: number) => <span className="tenant-muted">{n ?? 0}</span> },
            {
              title: 'Actions',
              width: 130,
              key: 'actions',
              render: (_: unknown, t: Tenant) => (
                <div className="d-flex align-items-center gap-2">
                  {canManage && <IconButton icon={<PenLine size={17} />} onClick={() => navigate(`/tenants/${t.id}/edit`)} title="Edit tenant" tone="neutral" />}
                  <IconButton icon={<Eye size={17} />} onClick={() => setViewTenant(t)} title="Preview tenant" tone="neutral" />
                </div>
              ),
            },
          ]}
        />
      </ListCard>

      {viewTenant && (
        <TenantDetailsModal
          tenant={tenants.find((x) => x.id === viewTenant.id) ?? viewTenant}
          onClose={() => setViewTenant(null)}
        />
      )}
      {planTenant && <ChangePlanModal tenant={planTenant} plans={plans} onClose={() => setPlanTenant(null)} onSaved={refresh} />}
        </>
      )}
    </AppLayout>
  )
}
