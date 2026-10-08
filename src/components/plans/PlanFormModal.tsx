import { useState, type FormEvent } from 'react'
import { Layers } from 'lucide-react'
import { Button, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { errorMessage, type Plan } from '../../api'
import { Notice } from '../ui/State'

export function PlanFormModal({
  plan,
  onClose,
  onSave,
}: {
  plan?: Plan
  onClose: () => void
  onSave: (data: {
    name: Plan['name']
    basePrice: number
    billingCycle: Plan['billingCycle']
    maxUsers: number
    maxTenants: number
    includedCourseCount: number
    features: string[]
    status: Plan['status']
  }) => Promise<void>
}) {
  const [name, setName] = useState<Plan['name']>(plan?.name ?? 'Basic')
  const [basePrice, setBasePrice] = useState(String(plan?.basePrice ?? 0))
  const [billingCycle, setBillingCycle] = useState<Plan['billingCycle']>(plan?.billingCycle ?? 'Monthly')
  const [maxUsers, setMaxUsers] = useState(String(plan?.maxUsers ?? 0))
  const [maxTenants, setMaxTenants] = useState(String(plan?.maxTenants ?? 0))
  const [includedCourseCount, setIncludedCourseCount] = useState(String(plan?.includedCourseCount ?? 5))
  const [features, setFeatures] = useState(plan?.features.join(', ') ?? '')
  const [status, setStatus] = useState<Plan['status']>(plan?.status ?? 'Active')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        name,
        basePrice: Number(basePrice) || 0,
        billingCycle,
        maxUsers: Number(maxUsers) || 0,
        maxTenants: Number(maxTenants) || 0,
        includedCourseCount: Number(includedCourseCount) || 0,
        features: features
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
        status,
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={plan ? 'Edit Plan' : 'Create Plan'}
      subtitle="Set the pricing, limits and included features"
      onClose={onClose}
      tone="brand"
      icon={<Layers size={20} />}
    >
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Plan Name" required>
          <Select
            value={name}
            onChange={setName}
            options={(['Basic', 'Professional', 'Enterprise'] as const).map((n) => ({ value: n, label: n }))}
            style={{ width: '100%' }}
          />
        </Field>

        <div className="row g-3">
          <div className="col-6">
            <Field label="Base Price" required hint="Numeric; 0 shows as Custom pricing">
              <Input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} prefix="₹" />
            </Field>
          </div>
          <div className="col-6">
            <Field label="Billing Cycle">
              <Select
                value={billingCycle}
                onChange={setBillingCycle}
                options={(['Monthly', 'Yearly'] as const).map((c) => ({ value: c, label: c }))}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-6">
            <Field label="Max Users" hint="0 = unlimited">
              <Input type="number" min={0} value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
            </Field>
          </div>
          <div className="col-6">
            <Field label="Max Tenants" hint="0 = unlimited">
              <Input type="number" min={0} value={maxTenants} onChange={(e) => setMaxTenants(e.target.value)} />
            </Field>
          </div>
        </div>

        <Field label="Included Free Courses (count)">
          <Input type="number" min={0} value={includedCourseCount} onChange={(e) => setIncludedCourseCount(e.target.value)} />
        </Field>

        <Field label="Features" hint="Comma separated">
          <Input.TextArea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            rows={2}
            placeholder="Core LMS access, Basic analytics, Email support"
          />
        </Field>

        <Field label="Status">
          <Select
            value={status}
            onChange={setStatus}
            options={(['Active', 'Inactive'] as const).map((st) => ({ value: st, label: st }))}
            style={{ width: '100%' }}
          />
        </Field>

        <div className="d-flex justify-content-end gap-3 pt-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {saving ? 'Saving…' : 'Save Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
