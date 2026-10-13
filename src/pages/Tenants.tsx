import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, PauseCircle, PlayCircle, Clock, Pencil, Trash2 } from 'lucide-react'
import { App } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Badge } from '../components/ui/Badge'
import { IconButton } from '../components/ui/IconButton'
import { Toolbar } from '../components/ui/Toolbar'
import { Notice } from '../components/ui/State'
import { confirmDialog } from '../components/ui/confirmOptions'
import { ChangePlanModal } from '../components/tenants/ChangePlanModal'
import { TenantDetailsModal } from '../components/tenants/TenantDetailsModal'
import { useData, useDataNeeds } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { api, errorMessage, type Tenant } from '../api'

const tenantFilters = ['All', 'Active', 'Suspended', 'Expired'] as const
const UNLIMITED = 999_999

export default function Tenants() {
  const { user } = useAuth()
  const canManage = user?.role === 'Super Admin'
  const { tenants, plans, refresh } = useData()
  useDataNeeds('tenants', 'plans', 'courses')
  const navigate = useNavigate()
  const { notification } = App.useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof tenantFilters)[number]>('All')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null)
  const [planTenant, setPlanTenant] = useState<Tenant | null>(null)
  const [actionError, setActionError] = useState('')

  // Suspend an active tenant / reactivate a suspended one; the server also keeps its subscription in step.
  const toggleStatus = async (t: Tenant) => {
    setBusyId(t.id)
    setActionError('')
    try {
      await api.setTenantStatus(t.id, t.status === 'Active' ? 'Suspended' : 'Active')
      await refresh()
      notification.success({ title: t.status === 'Active' ? 'Tenant suspended' : 'Tenant activated', description: t.name })
    } catch (e) {
      notification.error({ title: 'Action failed', description: `${t.name}: ${errorMessage(e)}` })
      setActionError(`${t.name}: ${errorMessage(e)}`)
    } finally {
      setBusyId(null)
    }
  }

  // The backend has no delete-tenant endpoint (tenants are only ever suspended/activated) — be upfront about that.
  const deleteTenant = (t: Tenant) => {
    notification.warning({ title: 'Cannot delete tenant', description: `${t.name}: Deleting tenants isn't supported yet.` })
  }

  const confirmToggle = (t: Tenant) => {
    const suspending = t.status === 'Active'
    confirmDialog({
      title: suspending ? 'Suspend tenant?' : 'Activate tenant?',
      content: suspending
        ? `Are you sure you want to suspend ${t.name}?`
        : `Are you sure you want to activate ${t.name}?`,
      okText: suspending ? 'Suspend Tenant' : 'Activate Tenant',
      okButtonProps: { danger: suspending },
      onOk: () => toggleStatus(t),
    })
  }

  const confirmDelete = (t: Tenant) =>
    confirmDialog({
      title: 'Delete tenant?',
      content: `Are you sure you want to delete ${t.name}?`,
      okText: 'Delete Tenant',
      okButtonProps: { danger: true },
      onOk: () => deleteTenant(t),
    })

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
          // Fixed layout + set widths: columns keep their size when a filter tab changes the rows, so the header never shifts.
          tableLayout="fixed"
          scroll={{ x: 1100 }}
          dataSource={rows}
          locale={{ emptyText: 'No tenants match your search.' }}
          columns={[
            { title: 'Tenant name', dataIndex: 'name', width: 260, ellipsis: true, render: (name: string, t) => <a onClick={() => setViewTenant(t)} className="tenant-name">{name}</a> },
            {
              title: 'Users / limit',
              width: 260,
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
            { title: 'Status', dataIndex: 'status', width: 150, render: (status: Tenant['status']) => <Badge>{status}</Badge> },
            { title: 'Created on', dataIndex: 'createdOn', width: 160, render: (d: string) => <span className="tenant-muted">{d}</span> },
            { title: 'Courses', dataIndex: 'courseCount', width: 110, className: 'col-center', render: (n: number) => <span className="tenant-muted">{n}</span> },
            ...(canManage
              ? [
                  {
                    title: 'Actions',
                    width: 160,
                    key: 'actions',
                    render: (_: unknown, t: Tenant) => (
                      <div className="d-flex align-items-center gap-2">
                        <IconButton icon={<Pencil size={16} />} onClick={() => navigate(`/tenants/${t.id}/edit`)} title="Edit tenant" tone="purple" />
                        <IconButton
                          icon={t.status === 'Active' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                          onClick={() => confirmToggle(t)}
                          title={t.status === 'Active' ? 'Suspend' : 'Activate'}
                          tone={t.status === 'Active' ? 'amber' : 'green'}
                          disabled={busyId === t.id}
                        />
                        <IconButton icon={<Trash2 size={16} />} onClick={() => confirmDelete(t)} title="Delete tenant" tone="red" />
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </ListCard>

      {viewTenant && (
        <TenantDetailsModal
          tenant={tenants.find((x) => x.id === viewTenant.id) ?? viewTenant}
          canManage={canManage}
          onClose={() => setViewTenant(null)}
          onEdit={() => {
            navigate(`/tenants/${viewTenant.id}/edit`)
          }}
        />
      )}
      {planTenant && <ChangePlanModal tenant={planTenant} plans={plans} onClose={() => setPlanTenant(null)} onSaved={refresh} />}
    </AppLayout>
  )
}
