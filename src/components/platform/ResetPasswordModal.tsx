import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Button, Input } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { errorMessage, type PlatformUser } from '../../api'
import { PASSWORD_HINT, stripSpaces, validatePassword } from '../../utils/validation'

/** Reset a platform user's password: the admin types the new one (twice). */
export function ResetPasswordModal({
  user,
  onClose,
  onSave,
}: {
  user: PlatformUser
  onClose: () => void
  onSave: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found: { password?: string; confirm?: string } = {}
    const passwordError = validatePassword(password)
    if (passwordError) found.password = passwordError
    if (!confirm) found.confirm = 'Confirm the password.'
    else if (confirm !== password) found.confirm = 'Passwords do not match.'
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    setError('')
    try {
      await onSave(password)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal title="Reset Password" subtitle={`${user.name} · ${user.email}`} onClose={onClose} tone="brand" icon={<KeyRound size={20} />}>
      <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="New Password" required error={errors.password} hint={PASSWORD_HINT}>
          <Input.Password
            value={password}
            status={errors.password ? 'error' : undefined}
            onChange={(e) => { setPassword(stripSpaces(e.target.value)); setErrors((p) => ({ ...p, password: undefined })) }}
            placeholder="Enter new password"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm Password" required error={errors.confirm}>
          <Input.Password
            value={confirm}
            status={errors.confirm ? 'error' : undefined}
            onChange={(e) => { setConfirm(stripSpaces(e.target.value)); setErrors((p) => ({ ...p, confirm: undefined })) }}
            placeholder="Re-enter new password"
            autoComplete="new-password"
          />
        </Field>
        <div className="d-flex justify-content-end gap-3 pt-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {saving ? 'Resetting…' : 'Reset Password'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
