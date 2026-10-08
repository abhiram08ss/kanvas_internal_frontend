import { useState } from 'react'
import { ShieldCheck, Headset, Plus } from 'lucide-react'
import { App, Avatar, Button } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { ErrorBlock, LoadingBlock, Notice } from '../components/ui/State'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Toolbar } from '../components/ui/Toolbar'
import { PlatformUserFormModal } from '../components/platform/PlatformUserFormModal'
import { api, errorMessage, roleLabel, type PlatformRole, type PlatformUser } from '../api'
import { useApi } from '../api/useApi'
import { useAuth } from '../context/AuthContext'

const countRole = (users: PlatformUser[], role: PlatformRole) => users.filter((u) => u.role === role).length

export default function PlatformUsers() {
  const { user: me } = useAuth()
  const { modal } = App.useApp()
  const { data: users, error, loading, reload } = useApi(api.platformUsers)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  const [issued, setIssued] = useState<{ user: string; password: string } | null>(null)

  const canManage = me?.role === 'Super Admin'
  const all = users ?? []
  const rows = all.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))

  const act = async (u: PlatformUser, fn: () => Promise<PlatformUser>) => {
    setBusyId(u.id)
    setActionError('')
    try {
      const updated = await fn()
      if (updated.temporaryPassword) setIssued({ user: updated.name, password: updated.temporaryPassword })
      reload()
    } catch (e) {
      setActionError(`${u.name}: ${errorMessage(e)}`)
    } finally {
      setBusyId(null)
    }
  }

  const addUser = async (data: { name: string; email: string; role: PlatformRole }) => {
    const created = await api.createPlatformUser(data)
    if (created.temporaryPassword) setIssued({ user: created.name, password: created.temporaryPassword })
    reload()
  }

  const removeUser = (u: PlatformUser) =>
    modal.confirm({
      title: `Delete "${u.name}"?`,
      content: 'This removes the account entirely — not just deactivates it. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        setBusyId(u.id)
        setActionError('')
        try {
          await api.deletePlatformUser(u.id)
          reload()
        } catch (e) {
          setActionError(`${u.name}: ${errorMessage(e)}`)
        } finally {
          setBusyId(null)
        }
      },
    })

  return (
    <AppLayout title="Platform Users" subtitle="Manage Kanvas staff — Super Admin (full access) and Content User (creates courses)">
      {loading && !users ? (
        <LoadingBlock />
      ) : error || !users ? (
        <ErrorBlock message={error ?? 'No data'} onRetry={reload} />
      ) : (
        <>
          <div className="row row-cols-1 row-cols-sm-2 g-3">
            <div className="col">
              <StatCard icon={<ShieldCheck size={20} />} label="Super Admin" value={countRole(all, 'Super Admin')} tone="purple" />
            </div>
            <div className="col">
              <StatCard icon={<Headset size={20} />} label="Content User" value={countRole(all, 'Support Admin')} tone="green" />
            </div>
          </div>

          <div className="mt-3">
            {actionError && (
              <Notice tone="error" onDismiss={() => setActionError('')}>
                {actionError}
              </Notice>
            )}
            {issued && (
              <Notice tone="success" onDismiss={() => setIssued(null)}>
                Temporary password for <strong>{issued.user}</strong> (shown once):{' '}
                <code className="rounded bg-white px-2 py-1" style={{ fontSize: 12 }}>
                  {issued.password}
                </code>
              </Notice>
            )}
          </div>

          <ListCard className="mt-3">
            <Toolbar
              query={query}
              onQueryChange={setQuery}
              searchPlaceholder="Search users..."
              newLabel={canManage ? 'Add User' : undefined}
              onNew={canManage ? () => setModalOpen(true) : undefined}
              newIcon={<Plus size={14} />}
            />
            <DataTable<PlatformUser>
              rowKey="id"
              dataSource={rows}
              locale={{ emptyText: 'No users match your search.' }}
              // Only 5 short columns here - letting them size to content (DataTable's default, meant for
              // wide/many-column tables that need horizontal scroll on narrow screens) left them all bunched
              // into the left third of the card with a dead gap on the right. Full width spreads them out.
              scroll={undefined}
              columns={[
                {
                  title: 'User',
                  dataIndex: 'name',
                  align: 'left',
                  render: (name: string, u) => (
                    <div className="d-flex align-items-center gap-3">
                      <Avatar style={{ background: '#5c2d91', fontSize: 12 }}>{u.initials}</Avatar>
                      <span className="fw-semibold">{name}</span>
                    </div>
                  ),
                },
                { title: 'Email', dataIndex: 'email', render: (email: string) => <span style={{ color: '#9b87b5' }}>{email}</span> },
                { title: 'Role', dataIndex: 'role', render: (role: PlatformRole) => <Badge tone="purple">{roleLabel(role)}</Badge> },
                { title: 'Status', dataIndex: 'status', render: (status: PlatformUser['status']) => <Badge>{status}</Badge> },
                { title: 'Last Login', dataIndex: 'lastLogin', render: (d: string) => <span style={{ color: '#9b87b5' }}>{d}</span> },
                ...(canManage
                  ? [
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: unknown, u: PlatformUser) => (
                          <div className="d-inline-flex gap-2 text-nowrap">
                            <Button
                              type="link"
                              size="small"
                              disabled={busyId === u.id || u.id === me?.id}
                              onClick={() => void act(u, () => api.updatePlatformUser(u.id, { status: u.status === 'Active' ? 'Inactive' : 'Active' }))}
                            >
                              {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              disabled={busyId === u.id || u.id === me?.id}
                              title={u.id === me?.id ? 'Use "Change Password" in the profile menu to change your own password' : undefined}
                              onClick={() => void act(u, () => api.resetPlatformUserPassword(u.id))}
                            >
                              Reset password
                            </Button>
                            <Button type="link" danger size="small" disabled={busyId === u.id || u.id === me?.id} onClick={() => removeUser(u)}>
                              Delete
                            </Button>
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </ListCard>
        </>
      )}

      {modalOpen && <PlatformUserFormModal onClose={() => setModalOpen(false)} onSave={addUser} />}
    </AppLayout>
  )
}
