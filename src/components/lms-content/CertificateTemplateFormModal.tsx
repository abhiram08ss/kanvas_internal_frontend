import { useState, type FormEvent } from 'react'
import { Award } from 'lucide-react'
import { Button, Checkbox, ColorPicker, Input, Radio, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { errorMessage, type CertificateTemplate, type CertificateTemplateInput, type SignatureSlot } from '../../api'

const DEFAULT_COLORS = ['#5c2d91', '#f5b800', '#ffffff']
const COLOR_LABELS = ['Primary Color', 'Accent Color', 'Background Color']
const DEFAULT_LOGO = 'Company Default'
const DEFAULT_SIGNATURES: SignatureSlot[] = [
  { enabled: true, title: 'HR Department', name: '' },
  { enabled: true, title: 'L&D Department', name: '' },
]

/** Older templates only have a flat `signatures` list of titles - turn it into the two slots. */
function initialSlots(template?: CertificateTemplate): SignatureSlot[] {
  if (template?.signatureDetails?.length) {
    return [0, 1].map((i) => template.signatureDetails[i] ?? { enabled: false, title: '', name: '' })
  }
  if (template) {
    return [0, 1].map((i) => ({ enabled: !!template.signatures[i], title: template.signatures[i] ?? '', name: '' }))
  }
  return DEFAULT_SIGNATURES
}

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
  const [customLogo, setCustomLogo] = useState(!!template && template.logo !== DEFAULT_LOGO)
  const [logo, setLogo] = useState(template && template.logo !== DEFAULT_LOGO ? template.logo : '')
  const [colors, setColors] = useState<string[]>(template?.colors ?? DEFAULT_COLORS)
  const [titleText, setTitleText] = useState(template?.titleText ?? 'CERTIFICATE OF COMPLETION')
  const [introText, setIntroText] = useState(template?.introText ?? 'This is to certify that')
  const [showPassScore, setShowPassScore] = useState(template?.showPassScore ?? true)
  const [slots, setSlots] = useState<SignatureSlot[]>(initialSlots(template))
  const [status, setStatus] = useState<CertificateTemplate['status']>(template?.status ?? 'Active')

  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setColor = (i: number, value: string) => setColors((prev) => prev.map((c, idx) => (idx === i ? value : c)))
  const setSlot = (i: number, patch: Partial<SignatureSlot>) =>
    setSlots((prev) => prev.map((sl, idx) => (idx === i ? { ...sl, ...patch } : sl)))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('Template name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const cleanSlots = slots.map((sl) => ({ ...sl, title: sl.title.trim(), name: sl.name.trim() }))
      await onSave({
        name: name.trim(),
        logo: customLogo ? logo.trim() || DEFAULT_LOGO : DEFAULT_LOGO,
        colors,
        signatures: cleanSlots.filter((sl) => sl.enabled && sl.title).map((sl) => sl.title),
        status,
        titleText: titleText.trim() || 'CERTIFICATE OF COMPLETION',
        introText: introText.trim() || 'This is to certify that',
        showPassScore,
        signatureDetails: cleanSlots,
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={template ? 'Edit Certificate Template' : 'Add Certificate Template'}
      subtitle="Logo, colours, wording and signatories shown on issued certificates"
      onClose={onClose}
      tone="brand"
      icon={<Award size={20} />}
    >
      <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}

        <Field label="Template Name" required error={nameError} hint={template ? "Name can't be changed after creation." : undefined}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameError('')
            }}
            disabled={!!template}
            status={nameError ? 'error' : undefined}
            placeholder="Enter template name"
          />
        </Field>

        <Field label="Logo">
          <Radio.Group value={customLogo ? 'custom' : 'default'} onChange={(e) => setCustomLogo(e.target.value === 'custom')}>
            <Radio value="default">Company Default Logo</Radio>
            <Radio value="custom">Custom Logo</Radio>
          </Radio.Group>
          {customLogo && <Input className="mt-2" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="Enter logo name or image URL" />}
        </Field>

        <div className="row g-3">
          {colors.map((c, i) => (
            <div key={i} className="col-12 col-md-4">
              <Field label={COLOR_LABELS[i]}>
                <ColorPicker
                  value={c}
                  showText
                  disabledAlpha
                  onChange={(color) => setColor(i, color.toHexString())}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                />
              </Field>
            </div>
          ))}
        </div>

        <Field label="Title Text">
          <Input value={titleText} onChange={(e) => setTitleText(e.target.value)} maxLength={120} placeholder="Enter certificate title" />
        </Field>

        <Field label="Intro Text">
          <Input value={introText} onChange={(e) => setIntroText(e.target.value)} maxLength={200} placeholder="Enter introduction text" />
        </Field>

        <Checkbox checked={showPassScore} onChange={(e) => setShowPassScore(e.target.checked)}>
          Show Pass Score % on Certificate
        </Checkbox>

        <div className="row g-3">
          {slots.map((sl, i) => (
            <div key={i} className="col-12 col-md-6 d-flex flex-column gap-2">
              <Checkbox checked={sl.enabled} onChange={(e) => setSlot(i, { enabled: e.target.checked })}>
                Signature {i + 1}
              </Checkbox>
              <Input
                value={sl.title}
                disabled={!sl.enabled}
                onChange={(e) => setSlot(i, { title: e.target.value })}
                maxLength={80}
                placeholder="Enter signatory title"
              />
              <Input
                value={sl.name}
                disabled={!sl.enabled}
                onChange={(e) => setSlot(i, { name: e.target.value })}
                maxLength={80}
                placeholder="Enter signatory name (optional)"
              />
            </div>
          ))}
        </div>

        {template && (
          <Field label="Status">
            <Select
              value={status}
              onChange={setStatus}
              options={(['Active', 'Inactive'] as const).map((st) => ({ value: st, label: st }))}
              style={{ width: '100%' }}
            />
          </Field>
        )}

        <div className="d-flex justify-content-end gap-3 pt-3 border-top">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {saving ? 'Saving…' : template ? 'Save Changes' : 'Save Template'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
