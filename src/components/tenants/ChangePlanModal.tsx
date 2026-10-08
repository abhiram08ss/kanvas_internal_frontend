import { useState, type FormEvent } from 'react'
import { Repeat } from 'lucide-react'
import { Button, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { useAuth } from '../../context/AuthContext'
import { api, errorMessage, type Plan, type Tenant } from '../../api'

const UNLIMITED = 999_999

export function ChangePlanModal({ tenant, plans, onClose, onSaved }: { tenant: Tenant; plans: Plan[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const { user } = useAuth()
  const canEdit = user?.role === 'Super Admin'
  const [planId, setPlanId] = useState(tenant.planId ?? plans.find((p) => p.status === 'Active')?.id ?? plans[0]?.id ?? 0)
  const [userLimit, setUserLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const changingPlan = planId !== tenant.planId
  const newPlan = plans.find((p) => p.id === planId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updateTenant(tenant.id, {
        ...(changingPlan ? { planId } : {}),
        ...(userLimit.trim() ? { userLimit: Number(userLimit) } : {}),
      })
      await onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Change plan — ${tenant.name}`}
      subtitle={`Currently ${tenant.plan ?? 'No plan'}, ${tenant.users} / ${tenant.userLimit >= UNLIMITED ? 'unlimited' : tenant.userLimit} users`}
      onClose={onClose}
      tone="brand"
      icon={<Repeat size={20} />}
    >
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        {!canEdit && <Notice tone="error">Only a Super Admin can change a tenant's plan — you are viewing it read-only.</Notice>}
        <Field
          label="Plan"
          hint={
            changingPlan
              ? 'Features are re-aligned to the new tier automatically (newly included features switch on, features above the tier switch off).'
              : undefined
          }
        >
          <Select
            disabled={!canEdit}
            value={planId}
            onChange={setPlanId}
            style={{ width: '100%' }}
            options={plans
              .filter((p) => p.status === 'Active' || p.id === tenant.planId)
              .map((p) => ({ value: p.id, label: `${p.name} — ${p.price}${p.period ? ` ${p.period}` : ''} · ${p.users}` }))}
          />
        </Field>
        <Field label="User limit (optional)" hint={`Cannot be lower than the tenant's current ${tenant.users} active users.`}>
          <Input
            disabled={!canEdit}
            type="number"
            min={1}
            value={userLimit}
            onChange={(e) => setUserLimit(e.target.value)}
            placeholder={
              changingPlan && newPlan
                ? `Default for ${newPlan.name}: ${newPlan.maxUsers > 0 ? newPlan.maxUsers : 'unlimited'}`
                : `Keep ${tenant.userLimit >= UNLIMITED ? 'unlimited' : tenant.userLimit}`
            }
          />
        </Field>
        <div className="d-flex justify-content-end gap-3 pt-2">
          <Button onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>
          {canEdit && (
            <Button type="primary" htmlType="submit" loading={saving} disabled={!changingPlan && !userLimit.trim()}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
