import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, Copy } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Notice } from '../components/ui/State'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Toolbar } from '../components/ui/Toolbar'
import { Button } from 'antd'
import { api, errorMessage, type Credentials, type ProvisioningRecord } from '../api'
import { useData, useDataNeeds } from '../context/DataContext'

const provisioningSteps = ['Create Kanvas Tenant', 'Setup LMS Tenant', 'Create Admin Account', 'Apply Configuration', 'Verify & Complete']

export default function Provisioning() {
  const { provisioningRecords, refresh } = useData()
  useDataNeeds('provisioningRecords')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  // Credentials are only ever returned once by the server, so keep them on screen until dismissed.
  const [issued, setIssued] = useState<{ tenant: string; credentials: Credentials } | null>(null)
  const [copied, setCopied] = useState(false)
  const rows = provisioningRecords.filter((r) => r.tenant.toLowerCase().includes(query.toLowerCase()))

  const run = async (record: ProvisioningRecord, action: () => Promise<Credentials | null>) => {
    setBusyId(record.id)
    setError('')
    try {
      const credentials = await action()
      if (credentials) {
        setIssued({ tenant: record.tenant, credentials })
        setCopied(false)
      }
      await refresh()
    } catch (e) {
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
    })

  const resetPassword = (r: ProvisioningRecord) => run(r, () => api.resetAdminPassword(r.id))

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
    <AppLayout title="Provisioning" subtitle="Track tenant setup — Kanvas tenant, LMS, admin account, configuration">
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
        <Toolbar query={query} onQueryChange={setQuery} searchPlaceholder="Search tenants..." />
        <DataTable<ProvisioningRecord>
          rowKey="id"
          dataSource={rows}
          locale={{ emptyText: 'No provisioning records match your search.' }}
          columns={[
            { title: 'Tenant', dataIndex: 'tenant', render: (t: string) => <span className="fw-semibold">{t}</span> },
            {
              title: 'LMS ID',
              dataIndex: 'lmsId',
              render: (id: string) => (
                <code className="rounded bg-light px-2 py-1 text-secondary" style={{ fontSize: 12 }}>
                  {id}
                </code>
              ),
            },
            { title: 'Admin Account', dataIndex: 'adminAccount', render: (a: string) => <span style={{ color: '#9b87b5' }}>{a}</span> },
            { title: 'Configuration', dataIndex: 'configuration' },
            {
              title: 'Status',
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
              title: 'Date',
              dataIndex: 'date',
              render: (d: string) => (
                <span className="text-nowrap" style={{ color: '#9b87b5' }}>
                  {d}
                </span>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, r) =>
                r.status === 'Success' ? (
                  <Button type="link" size="small" onClick={() => void resetPassword(r)} disabled={busyId === r.id} className="text-nowrap">
                    Reset admin password
                  </Button>
                ) : (
                  <Button type="link" size="small" onClick={() => void retry(r)} disabled={busyId === r.id}>
                    {busyId === r.id ? 'Retrying…' : 'Retry'}
                  </Button>
                ),
            },
          ]}
        />
      </ListCard>

      <Card className="mt-4 p-4">
        <h3 className="mb-4 font-display fs-6 fw-bold text-dark">Provisioning Flow</h3>
        <div className="d-flex flex-column flex-sm-row gap-4 align-items-sm-start justify-content-sm-between">
          {provisioningSteps.map((step, i) => (
            <div key={step} className="d-flex flex-grow-1 align-items-center gap-3 flex-sm-column text-sm-center">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle fw-semibold text-primary-emphasis flex-shrink-0"
                style={{ width: 36, height: 36 }}
              >
                {i + 1}
              </div>
              <p className="small fw-medium text-dark mb-0">{step}</p>
            </div>
          ))}
        </div>
      </Card>
    </AppLayout>
  )
}
