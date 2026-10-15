import { useState, type FormEvent } from 'react'
import { UserPlus } from 'lucide-react'
import { Button, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { errorMessage, roleLabel, type PlatformRole } from '../../api'
import { PASSWORD_HINT, stripSpaces, validatePassword } from '../../utils/validation'

const roles: PlatformRole[] = ['Super Admin', 'Support Admin']
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

export function PlatformUserFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: { name: string; email: string; role: PlatformRole; password: string }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<PlatformRole>('Support Admin')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found: { name?: string; email?: string; password?: string; confirm?: string } = {}
    if (!name.trim()) found.name = 'Full name is required.'
    else if (name.trim().length < 2) found.name = 'Full name must be at least 2 characters.'
    else if (!NAME_RE.test(name.trim())) found.name = "Name can only contain letters, spaces, . - and '"
    if (!email.trim()) found.email = 'Email is required.'
    else if (!EMAIL_RE.test(email.trim())) found.email = 'Enter a valid email address.'
    const passwordError = validatePassword(password)
    if (passwordError) found.password = passwordError
    if (!confirm) found.confirm = 'Confirm the password.'
    else if (confirm !== password) found.confirm = 'Passwords do not match.'
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), email: email.trim(), role, password })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal title="Add Platform User" subtitle="Set the password they will sign in with" onClose={onClose} tone="brand" icon={<UserPlus size={20} />}>
      <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Full Name" required error={errors.name}>
          <Input value={name} status={errors.name ? 'error' : undefined} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })) }} placeholder="Enter full name" />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input type="email" value={email} status={errors.email ? 'error' : undefined} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })) }} placeholder="Enter email address" />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={setRole} options={roles.map((r) => ({ value: r, label: roleLabel(r) }))} style={{ width: '100%' }} />
        </Field>
        <Field label="Password" required error={errors.password} hint={PASSWORD_HINT}>
          <Input.Password value={password} status={errors.password ? 'error' : undefined} onChange={(e) => { setPassword(stripSpaces(e.target.value)); setErrors((p) => ({ ...p, password: undefined })) }} placeholder="Enter password" autoComplete="new-password" />
        </Field>
        <Field label="Confirm Password" required error={errors.confirm}>
          <Input.Password value={confirm} status={errors.confirm ? 'error' : undefined} onChange={(e) => { setConfirm(stripSpaces(e.target.value)); setErrors((p) => ({ ...p, confirm: undefined })) }} placeholder="Re-enter password" autoComplete="new-password" />
        </Field>
        <div className="d-flex justify-content-end gap-3 pt-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {saving ? 'Adding…' : 'Add User'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
