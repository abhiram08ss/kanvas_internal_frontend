import { useState } from 'react'
import { Avatar, Dropdown } from 'antd'
import { ChevronDown, Lock, LogOut } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { roleLabel } from '../../../api'
import { ChangePasswordModal } from './ChangePasswordModal'

export function ProfileMenu() {
  const { user, logout } = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)

  return (
    <>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: [
            { key: 'password', icon: <Lock size={14} />, label: 'Change Password', onClick: () => setChangingPassword(true) },
            { type: 'divider' },
            { key: 'logout', icon: <LogOut size={14} />, label: 'Logout', danger: true, onClick: logout },
          ],
        }}
      >
        <button type="button" className="d-flex align-items-center gap-2 border-0 bg-transparent p-0 text-start">
          <Avatar style={{ background: 'linear-gradient(90deg, #683599 0%, #8246ab 100%)', fontWeight: 700 }}>{user?.initials ?? 'SA'}</Avatar>
          <div className="d-none d-md-block lh-sm">
            <p className="mb-0 fw-semibold" style={{ fontSize: 12, color: '#1a1228' }}>
              {user?.name}
            </p>
            <p className="mb-0" style={{ fontSize: 11, color: '#9b87b5' }}>
              {user && roleLabel(user.role)}
            </p>
          </div>
          <ChevronDown size={14} color="#9b87b5" />
        </button>
      </Dropdown>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </>
  )
}
