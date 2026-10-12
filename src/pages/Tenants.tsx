import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, PauseCircle, PlayCircle, Clock, Eye, Trash2 } from 'lucide-react'
import { Table } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { ListCard } from '../components/ui/ListCard'
import { Toolbar } from '../components/ui/Toolbar'
import { Notice } from '../components/ui/State'
import { ChangePlanModal } from '../components/tenants/ChangePlanModal'
import { TenantDetailsModal } from '../components/tenants/TenantDetailsModal'
import { EditTenantModal } from '../components/tenants/EditTenantModal'
import { useData, useDataNeeds } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { api, errorMessage, type Tenant } from '../api'

const tenantFilters = ['All', 'Active', 'Suspended', 'Expired'] as const
const UNLIMITED = 999_999
const PAGE_SIZE = 10

export default function Tenants() {
  const { user } = useAuth()
  const canManage = user?.role === 'Super Admin'
  const { tenants, plans, subscriptions, refresh } = useData()
  useDataNeeds('tenants', 'plans', 'subscriptions', 'courses')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof tenantFilters)[number]>('All')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null)
  const [planTenant, setPlanTenant] = useState<Tenant | null>(null)
  const [editTenant, setEditTenant] = useState<Tenant | null>(null)
  const [actionError, setActionError] = useState('')
  const [page, setPage] = useState(1)

  // Suspend an active tenant / reactivate a suspended one; the server also keeps its subscription in step.
  const toggleStatus = async (t: Tenant) => {
    setBusyId(t.id)
    setActionError('')
    try {
      await api.setTenantStatus(t.id, t.status === 'Active' ? 'Suspended' : 'Active')
      await refresh()
    } catch (e) {
      setActionError(`${t.name}: ${errorMessage(e)}`)
    } finally {
      setBusyId(null)
    }
  }

  // The backend has no delete-tenant endpoint (tenants are only ever suspended/activated) — be upfront about that.
  const deleteTenant = (t: Tenant) => setActionError(`${t.name}: Deleting tenants isn't supported yet.`)

  const rows = useMemo(
    () =>
      tenants.filter((t) => {
        const matchesQuery = t.name.toLowerCase().includes(query.toLowerCase())
        const matchesFilter = filter === 'All' || t.status === filter
        return matchesQuery && matchesFilter
      }),
    [tenants, query, filter],
  )

  const subscriptionEnd = useMemo(() => {
    const byTenant = new Map<number, string>()
    for (const sub of subscriptions) byTenant.set(sub.tenantId, sub.renewalDate)
    return byTenant
  }, [subscriptions])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <AppLayout title="Tenants" subtitle="Create and manage all LMS tenant organisations">
      <div className="row row-cols-2 row-cols-lg-4 g-3">
        <div className="col">
          <StatCard icon={<Building2 size={20} />} label="Total Tenants" value={tenants.length} tone="purple" />
        </div>
        <div className="col">
          <StatCard icon={<CheckCircle2 size={20} />} label="Active" value={tenants.filter((t) => t.status === 'Active').length} tone="green" />
        </div>
        <div className="col">
          <StatCard icon={<PauseCircle size={20} />} label="Suspended" value={tenants.filter((t) => t.status === 'Suspended').length} tone="amber" />
        </div>
        <div className="col">
          <StatCard icon={<Clock size={20} />} label="Expired" value={tenants.filter((t) => t.status === 'Expired').length} tone="red" />
        </div>
      </div>

      {actionError && (
        <div className="mt-3">
          <Notice tone="error" onDismiss={() => setActionError('')}>
            {actionError}
          </Notice>
        </div>
      )}

      <ListCard className="mt-4">
        <Toolbar
          query={query}
          onQueryChange={(q) => { setQuery(q); setPage(1) }}
          searchPlaceholder="Search tenants..."
          filters={tenantFilters}
          activeFilter={filter}
          onFilterChange={(f) => { setFilter(f); setPage(1) }}
          newLabel={canManage ? 'New Tenant' : undefined}
          onNew={canManage ? () => navigate('/tenants/new') : undefined}
        />
        <Table<Tenant>
          className="tenant-table"
          rowKey="id"
          dataSource={pageRows}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No tenants match your search.' }}
          columns={[
            { title: '#', dataIndex: 'id', width: 60, render: (id: number) => <span className="tenant-muted">{id}</span> },
            {
              title: 'Tenant name',
              dataIndex: 'name',
              render: (name: string, t) => (
                <a onClick={() => setViewTenant(t)} className="tenant-name">
                  {name}
                </a>
              ),
            },
            { title: 'Plan', dataIndex: 'plan', render: (plan: string | null) => plan ?? '—' },
            {
              title: 'Users / limit',
              key: 'users',
              render: (_: unknown, t) => {
                const unlimited = t.userLimit >= UNLIMITED
                const percent = unlimited ? 0 : Math.min(100, Math.round((t.users / t.userLimit) * 100))
                const hot = !unlimited && percent >= 90
                return (
                  <div className="tenant-usage">
                    <div className="d-flex justify-content-between align-items-baseline">
                      <span className={hot ? 'is-hot' : ''}>
                        <strong>{t.users}</strong> / {unlimited ? '∞' : t.userLimit}
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
            {
              title: 'Status',
              dataIndex: 'status',
              render: (status: Tenant['status']) => (
                <span className={`tenant-status is-${status.toLowerCase()}`}>
                  <span className="dot" />
                  {status}
                </span>
              ),
            },
            { title: 'Created on', dataIndex: 'createdOn', render: (d: string) => <span className="tenant-muted">{d}</span> },
            {
              title: 'Subscription end',
              key: 'subEnd',
              render: (_: unknown, t) => <span className="tenant-muted">{subscriptionEnd.get(t.id) ?? '—'}</span>,
            },
            { title: 'Courses', dataIndex: 'courseCount', render: (n: number) => <span className="tenant-muted">{n}</span> },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, t) => (
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="tenant-action is-view"
                    onClick={() => setViewTenant(t)}
                    title="View tenant"
                    aria-label="View tenant"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        className={`tenant-action ${t.status === 'Active' ? 'is-pause' : 'is-play'}`}
                        onClick={() => void toggleStatus(t)}
                        disabled={busyId === t.id}
                        title={t.status === 'Active' ? 'Suspend' : 'Activate'}
                        aria-label={t.status === 'Active' ? 'Suspend' : 'Activate'}
                      >
                        {t.status === 'Active' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                      </button>
                      <button type="button" className="tenant-action is-delete" onClick={() => deleteTenant(t)} title="Delete tenant" aria-label="Delete tenant">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
        <div className="tenant-footer">
          <span className="tenant-muted">
            {rows.length} tenant{rows.length === 1 ? '' : 's'}
          </span>
          <div className="d-flex align-items-center gap-2">
            <button type="button" className="tenant-page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              Previous
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className={`tenant-page-btn is-num${n === currentPage ? ' is-active' : ''}`} onClick={() => setPage(n)}>
                {n}
              </button>
            ))}
            <button type="button" className="tenant-page-btn" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
              Next
            </button>
          </div>
        </div>
      </ListCard>

      {viewTenant && (
        <TenantDetailsModal
          tenant={tenants.find((x) => x.id === viewTenant.id) ?? viewTenant}
          canManage={canManage}
          onClose={() => setViewTenant(null)}
          onUpdatePlan={() => {
            setPlanTenant(viewTenant)
            setViewTenant(null)
          }}
          onEdit={() => {
            setEditTenant(viewTenant)
            setViewTenant(null)
          }}
        />
      )}
      {editTenant && <EditTenantModal tenant={editTenant} onClose={() => setEditTenant(null)} onSaved={refresh} />}
      {planTenant && <ChangePlanModal tenant={planTenant} plans={plans} onClose={() => setPlanTenant(null)} onSaved={refresh} />}
    </AppLayout>
  )
}
