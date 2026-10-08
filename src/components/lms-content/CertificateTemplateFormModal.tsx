import { useState, type FormEvent } from 'react'
import { Award } from 'lucide-react'
import { Button, ColorPicker, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { errorMessage, type CertificateTemplate, type CertificateTemplateInput } from '../../api'

const DEFAULT_COLORS = ['#5c2d91', '#7b3fa0', '#f5f4f8']

export function CertificateTemplateFormModal({
  template,
  onClose,
  onSave,
}: {
  template?: CertificateTemplate
  onClose: () => void
  onSave: (data: CertificateTemplateInput) => Promise<void>
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [logo, setLogo] = useState(template?.logo ?? 'Company Default')
  const [colors, setColors] = useState<string[]>(template?.colors ?? DEFAULT_COLORS)
  const [signatures, setSignatures] = useState(template?.signatures.join(', ') ?? '')
  const [status, setStatus] = useState<CertificateTemplate['status']>(template?.status ?? 'Active')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setColor = (i: number, value: string) => setColors((prev) => prev.map((c, idx) => (idx === i ? value : c)))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        logo: logo.trim() || 'Company Default',
        colors,
        signatures: signatures
          .split(',')
          .map((s) => s.trim())
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
      title={template ? 'Edit Certificate Template' : 'New Certificate Template'}
      subtitle="Colours, logo and signatories shown on issued certificates"
      onClose={onClose}
      tone="brand"
      icon={<Award size={20} />}
    >
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}

        <Field label="Name" required hint={template ? "Name can't be changed after creation." : undefined}>
          <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={!!template} placeholder="e.g. Standard Completion Certificate" />
        </Field>

        <Field label="Logo">
          <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="Company Default" />
        </Field>

        <Field label="Colors" hint="Primary, accent and background">
          <div className="d-flex gap-3">
            {colors.map((c, i) => (
              <ColorPicker key={i} value={c} showText disabledAlpha onChange={(color) => setColor(i, color.toHexString())} />
            ))}
          </div>
        </Field>

        <Field label="Signatures" hint="Comma separated">
          <Input.TextArea value={signatures} onChange={(e) => setSignatures(e.target.value)} rows={2} placeholder="HR Department, L&D Department" />
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
            {saving ? 'Saving…' : template ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
