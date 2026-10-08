import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, PauseCircle, PlayCircle, Clock, Eye, Trash2 } from 'lucide-react'
import { Progress } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Toolbar } from '../components/ui/Toolbar'
import { IconButton } from '../components/ui/IconButton'
import { Badge } from '../components/ui/Badge'
import { Notice } from '../components/ui/State'
import { ChangePlanModal } from '../components/tenants/ChangePlanModal'
import { useData, useDataNeeds } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { api, errorMessage, type Tenant } from '../api'

const tenantFilters = ['All', 'Active', 'Suspended', 'Expired'] as const
const UNLIMITED = 999_999

export default function Tenants() {
  const { user } = useAuth()
  const canManage = user?.role === 'Super Admin'
  const { tenants, plans, refresh } = useData()
  useDataNeeds('tenants', 'plans')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof tenantFilters)[number]>('All')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [planTenant, setPlanTenant] = useState<Tenant | null>(null)
  const [actionError, setActionError] = useState('')

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
          onQueryChange={setQuery}
          searchPlaceholder="Search tenants..."
          filters={tenantFilters}
          activeFilter={filter}
          onFilterChange={setFilter}
          newLabel={canManage ? 'New Tenant' : undefined}
          onNew={canManage ? () => navigate('/tenants/new') : undefined}
        />
        <DataTable<Tenant>
          rowKey="id"
          dataSource={rows}
          locale={{ emptyText: 'No tenants match your search.' }}
          columns={[
            { title: '#', dataIndex: 'id', render: (id: number) => <span style={{ color: '#9b87b5' }}>{id}</span> },
            {
              title: 'Tenant Name',
              dataIndex: 'name',
              render: (name: string, t) => (
                <a onClick={() => setPlanTenant(t)} className="fw-semibold" style={{ color: '#5c2d91' }}>
                  {name}
                </a>
              ),
            },
            { title: 'Plan', dataIndex: 'plan', render: (plan: string | null) => plan ?? '—' },
            {
              title: 'Users / Limit',
              key: 'users',
              render: (_: unknown, t) => {
                const unlimited = t.userLimit >= UNLIMITED
                const percent = unlimited ? 0 : Math.min(100, Math.round((t.users / t.userLimit) * 100))
                const overloaded = !unlimited && percent >= 90
                return (
                  <div style={{ minWidth: 90 }}>
                    <span style={{ color: overloaded ? '#dc2626' : '#1a1228' }}>
                      {t.users} / {unlimited ? '∞' : t.userLimit}
                    </span>
                    {!unlimited && <Progress percent={percent} showInfo={false} size="small" strokeColor={overloaded ? '#dc2626' : '#5c2d91'} />}
                  </div>
                )
              },
            },
            { title: 'Status', dataIndex: 'status', render: (status: Tenant['status']) => <Badge>{status}</Badge> },
            { title: 'Created On', dataIndex: 'createdOn', render: (d: string) => <span style={{ color: '#9b87b5' }}>{d}</span> },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, t) => (
                <div className="d-flex align-items-center justify-content-center gap-2">
                  <IconButton icon={<Eye size={14} />} onClick={() => setPlanTenant(t)} title={canManage ? 'Manage tenant' : 'View tenant'} tone="blue" />
                  {canManage && (
                    <>
                      <IconButton
                        icon={t.status === 'Active' ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                        onClick={() => void toggleStatus(t)}
                        disabled={busyId === t.id}
                        title={t.status === 'Active' ? 'Suspend' : 'Activate'}
                        tone={t.status === 'Active' ? 'amber' : 'green'}
                      />
                      <IconButton icon={<Trash2 size={14} />} onClick={() => deleteTenant(t)} title="Delete tenant" tone="red" />
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      </ListCard>

      {planTenant && <ChangePlanModal tenant={planTenant} plans={plans} onClose={() => setPlanTenant(null)} onSaved={refresh} />}
    </AppLayout>
  )
}
