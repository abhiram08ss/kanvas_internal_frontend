import { useState } from 'react'
import { ShieldCheck, Headset, Plus, PauseCircle, PlayCircle, KeyRound, Trash2 } from 'lucide-react'
import { App, Avatar } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { confirmDialog } from '../components/ui/confirmOptions'
import { reasonDialog } from '../components/ui/reasonDialog'
import { IconButton } from '../components/ui/IconButton'
import { ErrorBlock, LoadingBlock, Notice } from '../components/ui/State'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Toolbar } from '../components/ui/Toolbar'
import { PlatformUserFormModal } from '../components/platform/PlatformUserFormModal'
import { ResetPasswordModal } from '../components/platform/ResetPasswordModal'
import { api, errorMessage, roleLabel, type PlatformRole, type PlatformUser } from '../api'
import { useApi } from '../api/useApi'
import { useAuth } from '../context/AuthContext'

const countRole = (users: PlatformUser[], role: PlatformRole) => users.filter((u) => u.role === role).length

export default function PlatformUsers() {
  const { user: me } = useAuth()
  const { notification } = App.useApp()
  const { data: users, error, loading, reload } = useApi(api.platformUsers)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [resetting, setResetting] = useState<PlatformUser | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  const canManage = me?.role === 'Super Admin'
  const all = users ?? []
  const rows = all.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))

  const act = async (u: PlatformUser, fn: () => Promise<PlatformUser>, done: string) => {
    setBusyId(u.id)
    setActionError('')
    try {
      await fn()
      notification.success({ title: done, description: u.name })
      reload()
    } catch (e) {
      notification.error({ title: 'Action Failed', description: `${u.name}: ${errorMessage(e)}` })
      setActionError(`${u.name}: ${errorMessage(e)}`)
    } finally {
      setBusyId(null)
    }
  }

  const addUser = async (data: { name: string; email: string; role: PlatformRole; password: string }) => {
    const created = await api.createPlatformUser(data)
    notification.success({ title: 'User Created', description: `${created.name} was created successfully.` })
    reload()
  }

  const confirmToggle = (u: PlatformUser) => {
    if (u.status === 'Active') {
      reasonDialog({
        title: 'Deactivate User?',
        content: `Are you sure you want to deactivate ${u.name}?`,
        okText: 'Deactivate User',
        onOk: (reason) => act(u, () => api.updatePlatformUser(u.id, { status: 'Inactive', reason }), 'User deactivated'),
      })
      return
    }
    confirmDialog({
      title: 'Activate User?',
      content: `Are you sure you want to activate ${u.name}?`,
      okText: 'Activate User',
      onOk: () => act(u, () => api.updatePlatformUser(u.id, { status: 'Active' }), 'User activated'),
    })
  }

  // Errors are NOT swallowed here (unlike `act`): they reach the Reset Password popup, which stays open and shows the reason.
  const resetPassword = async (u: PlatformUser, password: string) => {
    await api.resetPlatformUserPassword(u.id, password)
    notification.success({
      title: 'Password Reset',
      description: `${u.name} can now sign in with the username "${u.username}" (or the email ${u.email}) and the new password.`,
      duration: 10,
    })
    reload()
  }

  const removeUser = (u: PlatformUser) =>
    confirmDialog({
      title: 'Delete User?',
      content: `Are you sure you want to delete ${u.name}?`,
      okText: 'Delete User',
      okButtonProps: { danger: true },
      onOk: async () => {
        setBusyId(u.id)
        setActionError('')
        try {
          await api.deletePlatformUser(u.id)
          notification.success({ title: 'User Deleted', description: u.name })
          reload()
        } catch (e) {
          notification.error({ title: 'Action Failed', description: `${u.name}: ${errorMessage(e)}` })
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
              <StatCard icon={<ShieldCheck size={20} />} label="Super Admin" value={countRole(all, 'Super Admin')} hint="full access" tone="purple" />
            </div>
            <div className="col">
              <StatCard icon={<Headset size={20} />} label="Content User" value={countRole(all, 'Support Admin')} hint="content access" tone="green" />
            </div>
          </div>

          <div className="mt-3">
            {actionError && (
              <Notice tone="error" onDismiss={() => setActionError('')}>
                {actionError}
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
              serial={false}
              rowKey="id"
              dataSource={rows}
              locale={{ emptyText: 'No users match your search.' }}
              columns={[
                {
                  title: 'User Name',
                  dataIndex: 'name',
                  align: 'left',
                  render: (name: string, u) => (
                    <div className="d-flex align-items-center gap-3">
                      <Avatar style={{ background: 'linear-gradient(90deg, #683599 0%, #8246ab 100%)', fontSize: 12 }}>{u.initials}</Avatar>
                      <span>{name}</span>
                    </div>
                  ),
                },
                { title: 'Username', width: 160, dataIndex: 'username', render: (username: string) => <span className="tenant-muted">{username}</span> },
                { title: 'Email', width: 260, dataIndex: 'email', render: (email: string) => <span className="tenant-muted">{email}</span> },
                { title: 'Role', width: 150, dataIndex: 'role', render: (role: PlatformRole) => <Badge tone="purple">{roleLabel(role)}</Badge> },
                { title: 'Status', width: 130, dataIndex: 'status', render: (status: PlatformUser['status']) => <Badge>{status}</Badge> },
                { title: 'Last Login', width: 180, dataIndex: 'lastLogin', render: (d: string) => <span className="tenant-muted">{d}</span> },
                ...(canManage
                  ? [
                      {
                        title: 'Actions', width: 180,
                        key: 'actions',
                        render: (_: unknown, u: PlatformUser) => (
                          <div className="d-flex align-items-center gap-2">
                            <IconButton
                              icon={u.status === 'Active' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                              title={u.status === 'Active' ? 'Deactivate' : 'Activate'}
                              tone={u.status === 'Active' ? 'amber' : 'green'}
                              disabled={busyId === u.id || u.id === me?.id}
                              onClick={() => confirmToggle(u)}
                            />
                            <IconButton
                              icon={<KeyRound size={16} />}
                              title={u.id === me?.id ? 'Use "Change Password" in the profile menu to change your own password' : 'Reset password'}
                              tone="purple"
                              disabled={busyId === u.id || u.id === me?.id}
                              onClick={() => setResetting(u)}
                            />
                            <IconButton icon={<Trash2 size={16} />} title="Delete" tone="red" disabled={busyId === u.id || u.id === me?.id} onClick={() => removeUser(u)} />
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

      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} onSave={(password) => resetPassword(resetting, password)} />}
      {modalOpen && <PlatformUserFormModal onClose={() => setModalOpen(false)} onSave={addUser} />}
    </AppLayout>
  )
}
