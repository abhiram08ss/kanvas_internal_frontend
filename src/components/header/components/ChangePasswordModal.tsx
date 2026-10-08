import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Button, Input } from 'antd'
import { Modal } from '../../ui/Modal'
import { Field } from '../../ui/Field'
import { Notice } from '../../ui/State'
import { api, errorMessage } from '../../../api'

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.changePassword(currentPassword, newPassword)
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Change Password" subtitle="Update the password for your own account" onClose={onClose} tone="brand" icon={<KeyRound size={20} />}>
      {done ? (
        <>
          <Notice tone="success">Your password has been changed.</Notice>
          <div className="d-flex justify-content-end">
            <Button type="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {error && <Notice tone="error">{error}</Notice>}
          <Field label="Current Password" required>
            <Input.Password value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Field label="New Password" required hint="At least 8 characters">
            <Input.Password value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Confirm New Password" required>
            <Input.Password value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </Field>
          <div className="d-flex justify-content-end gap-3 pt-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {saving ? 'Saving…' : 'Change Password'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
