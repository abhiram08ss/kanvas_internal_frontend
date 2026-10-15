import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, Copy, KeyRound, RefreshCw } from 'lucide-react'
import { StatCard } from '../components/ui/StatCard'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { IconButton } from '../components/ui/IconButton'
import { Notice } from '../components/ui/State'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Toolbar } from '../components/ui/Toolbar'
import { useFitRows } from '../components/ui/useFitRows'
import { App, Button } from 'antd'
import { confirmDialog } from '../components/ui/confirmOptions'
import { api, errorMessage, type Credentials, type ProvisioningRecord } from '../api'
import { useData, useDataNeeds } from '../context/DataContext'

const statusFilters = ['All', 'Success', 'Failed', 'Pending'] as const
const provisioningSteps = ['Create Kanvas Tenant', 'Setup LMS Tenant', 'Create Admin Account', 'Apply Configuration', 'Verify & Complete']

/** Tenant provisioning status - shown as the "Provisioning" tab of the Tenants page. */
export function ProvisioningPanel() {
  const { notification } = App.useApp()
  const { provisioningRecords, refresh } = useData()
  useDataNeeds('provisioningRecords')
  const [query, setQuery] = useState('')
  const pageSize = useFitRows(520)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  // Credentials are only ever returned once by the server, so keep them on screen until dismissed.
  const [issued, setIssued] = useState<{ tenant: string; credentials: Credentials } | null>(null)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>('All')
  const rows = provisioningRecords.filter((r) => r.tenant.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || r.status === filter))

  const run = async (record: ProvisioningRecord, action: () => Promise<Credentials | null>, done: string) => {
    setBusyId(record.id)
    setError('')
    try {
      const credentials = await action()
      if (credentials) {
        setIssued({ tenant: record.tenant, credentials })
        setCopied(false)
      }
      notification.success({ title: done, description: record.tenant })
      await refresh()
    } catch (e) {
      notification.error({ title: 'Action Failed', description: `${record.tenant}: ${errorMessage(e)}` })
      setError(`${record.tenant}: ${errorMessage(e)}`)
    } finally {
      setBusyId(null)
    }
  }

  const retry = (r: ProvisioningRecord) =>
    run(r, async () => {
      const result = await api.retryProvisioning(r.id)
      if (result.status === 'Failed') throw new Error(result.error ?? 'Provisioning failed again')
      return result.credentials
    }, 'Provisioning retried')

  const resetPassword = (r: ProvisioningRecord) => run(r, () => api.resetAdminPassword(r.id), 'Admin password reset')

  const confirmReset = (r: ProvisioningRecord) =>
    confirmDialog({
      title: 'Reset Admin Password?',
      content: `Are you sure you want to reset the admin password for ${r.tenant}?`,
      okText: 'Reset Password',
      okButtonProps: { danger: true },
      onOk: () => resetPassword(r),
    })

  const confirmRetry = (r: ProvisioningRecord) =>
    confirmDialog({
      title: 'Retry Provisioning?',
      content: `Are you sure you want to retry provisioning for ${r.tenant}?`,
      okText: 'Retry Provisioning',
      onOk: () => retry(r),
    })

  const copyCredentials = async () => {
    if (!issued) return
    const { lmsUrl, username, temporaryPassword } = issued.credentials
    try {
      await navigator.clipboard.writeText(`LMS URL: ${lmsUrl}\nUsername: ${username}\nTemporary Password: ${temporaryPassword}`)
      setCopied(true)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <>
      <div className="row row-cols-1 row-cols-sm-3 g-3">
        <div className="col">
          <StatCard
            icon={<CheckCircle2 size={20} />}
            label="Successful"
            value={provisioningRecords.filter((r) => r.status === 'Success').length}
            hint="provisioned"
            tone="green"
          />
        </div>
        <div className="col">
          <StatCard
            icon={<XCircle size={20} />}
            label="Failed"
            value={provisioningRecords.filter((r) => r.status === 'Failed').length}
            hint="needs retry"
            tone="red"
          />
        </div>
        <div className="col">
          <StatCard
            icon={<Clock size={20} />}
            label="Pending"
            value={provisioningRecords.filter((r) => r.status === 'Pending').length}
            hint="in progress"
            tone="amber"
          />
        </div>
      </div>

      <div className="mt-3">
        {error && (
          <Notice tone="error" onDismiss={() => setError('')}>
            {error}
          </Notice>
        )}
        {issued && (
          <Notice tone="success" onDismiss={() => setIssued(null)}>
            <p className="fw-semibold mb-0">New LMS admin credentials for {issued.tenant} — shown only once</p>
            <p className="mt-1 mb-0" style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {issued.credentials.lmsUrl} · {issued.credentials.username} · {issued.credentials.temporaryPassword}
            </p>
            <Button type="link" size="small" onClick={copyCredentials} icon={<Copy size={12} />} className="p-0 mt-2">
              {copied ? 'Copied!' : 'Copy details'}
            </Button>
          </Notice>
        )}
      </div>

      <ListCard className="mt-3">
        <Toolbar query={query} onQueryChange={setQuery} searchPlaceholder="Search tenants..." filters={statusFilters} activeFilter={filter} onFilterChange={setFilter} />
        <DataTable<ProvisioningRecord>
          serial={false}
          rowKey="id"
          pageSize={pageSize}
          dataSource={rows}
          locale={{ emptyText: 'No provisioning records match your search.' }}
          columns={[
            { title: 'Tenant', dataIndex: 'tenant', render: (t: string) => <span>{t}</span> },
            {
              title: 'LMS ID', width: 130,
              dataIndex: 'lmsId',
              render: (id: string) => (
                <code className="rounded bg-light px-2 py-1 text-secondary" style={{ fontSize: 12 }}>
                  {id}
                </code>
              ),
            },
            { title: 'Admin Account', width: 200, dataIndex: 'adminAccount', render: (a: string) => <span className="tenant-muted">{a}</span> },
            { title: 'Configuration', width: 150, dataIndex: 'configuration' },
            {
              title: 'Status', width: 140,
              dataIndex: 'status',
              render: (status: ProvisioningRecord['status'], r) => (
                <>
                  <Badge>{status}</Badge>
                  {r.error && (
                    <p className="mt-1 mb-0 text-danger" style={{ maxWidth: 220, fontSize: 12 }}>
                      {r.error}
                    </p>
                  )}
                </>
              ),
            },
            {
              title: 'Date', width: 190,
              dataIndex: 'date',
              render: (d: string) => (
                <span className="text-nowrap tenant-muted">
                  {d}
                </span>
              ),
            },
            {
              title: 'Actions', width: 110,
              key: 'actions',
              render: (_: unknown, r) =>
                r.status === 'Success' ? (
                  <IconButton icon={<KeyRound size={16} />} title="Reset admin password" tone="purple" disabled={busyId === r.id} onClick={() => confirmReset(r)} />
                ) : (
                  <IconButton icon={<RefreshCw size={16} />} title={busyId === r.id ? 'Retrying…' : 'Retry'} tone="amber" disabled={busyId === r.id} onClick={() => confirmRetry(r)} />
                ),
            },
          ]}
        />
      </ListCard>

      <Card className="mt-3 px-4 py-3">
        <div className="d-flex align-items-center gap-4">
          <span className="fw-bold text-dark flex-shrink-0" style={{ fontSize: 14 }}>Provisioning flow</span>
          <div className="d-flex align-items-center flex-grow-1" style={{ minWidth: 0 }}>
            {provisioningSteps.map((step, i) => (
              <div key={step} className="d-flex align-items-center" style={{ flex: i < provisioningSteps.length - 1 ? '1 1 auto' : '0 0 auto', minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <span
                    className="d-flex align-items-center justify-content-center rounded-circle fw-bold flex-shrink-0"
                    style={{ width: 26, height: 26, fontSize: 12, color: '#fff', background: 'linear-gradient(135deg, #5c2d91, #8a4bb0)', boxShadow: '0 2px 6px rgba(92, 45, 145, 0.3)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="fw-semibold text-nowrap" style={{ fontSize: 12.5, color: '#3d3450' }}>{step}</span>
                </div>
                {i < provisioningSteps.length - 1 && <span className="flex-grow-1 mx-3" style={{ height: 2, minWidth: 16, borderRadius: 2, background: 'linear-gradient(90deg, #d9cdee, #eee7f8)' }} />}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </>
  )
}
