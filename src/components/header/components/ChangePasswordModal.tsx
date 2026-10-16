import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { App, Button, Input } from 'antd'
import { Modal } from '../../ui/Modal'
import { Field } from '../../ui/Field'
import { Notice } from '../../ui/State'
import { scrollToFirstError } from '../../ui/scrollToError'
import { api, errorMessage } from '../../../api'
import { PASSWORD_HINT, stripSpaces, validatePassword } from '../../../utils/validation'

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const { notification } = App.useApp()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return // Enter pressed again while the first save is still running
    const errs: typeof fieldErrors = {}
    if (!currentPassword) errs.current = 'Enter your current password.'
    const nextError = validatePassword(newPassword)
    if (nextError) errs.next = nextError.replace(/^Password/, 'New password')
    else if (newPassword === currentPassword) errs.next = 'New password must be different from the current one.'
    if (!confirmPassword) errs.confirm = 'Re-enter the new password.'
    else if (newPassword !== confirmPassword) errs.confirm = 'New password and confirmation do not match.'
    setFieldErrors(errs)
    if (errs.current || errs.next || errs.confirm) {
      setError('Please fix the highlighted fields.')
      scrollToFirstError(e.currentTarget as HTMLElement)
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.changePassword(currentPassword, newPassword)
      notification.success({ title: 'Password Changed', description: 'Your password has been updated.' })
      setDone(true)
    } catch (err) {
      const message = errorMessage(err)
      if (/current password/i.test(message)) setFieldErrors({ current: message })
      else setError(message)
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
        <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
          {error && <Notice tone="error">{error}</Notice>}
          <Field label="Current Password" required error={fieldErrors.current}>
            <Input.Password value={currentPassword} onChange={(e) => { setCurrentPassword(stripSpaces(e.target.value)); setFieldErrors((p) => ({ ...p, current: undefined })) }} status={fieldErrors.current ? 'error' : undefined} autoComplete="current-password" />
          </Field>
          <Field label="New Password" required error={fieldErrors.next} hint={PASSWORD_HINT}>
            <Input.Password value={newPassword} onChange={(e) => { setNewPassword(stripSpaces(e.target.value)); setFieldErrors((p) => ({ ...p, next: undefined })) }} status={fieldErrors.next ? 'error' : undefined} autoComplete="new-password" />
          </Field>
          <Field label="Confirm New Password" required error={fieldErrors.confirm}>
            <Input.Password value={confirmPassword} onChange={(e) => { setConfirmPassword(stripSpaces(e.target.value)); setFieldErrors((p) => ({ ...p, confirm: undefined })) }} status={fieldErrors.confirm ? 'error' : undefined} autoComplete="new-password" />
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
