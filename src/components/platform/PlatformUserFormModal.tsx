import { useState, type FormEvent } from 'react'
import { UserPlus } from 'lucide-react'
import { Button, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { errorMessage, roleLabel, type PlatformRole } from '../../api'

const roles: PlatformRole[] = ['Super Admin', 'Support Admin']

export function PlatformUserFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: { name: string; email: string; role: PlatformRole }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<PlatformRole>('Support Admin')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), email: email.trim(), role })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal title="Add Platform User" subtitle="A temporary password is generated and shown once" onClose={onClose} tone="brand" icon={<UserPlus size={20} />}>
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Full Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Priya Nair" />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@company.com" />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={setRole} options={roles.map((r) => ({ value: r, label: roleLabel(r) }))} style={{ width: '100%' }} />
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
