import { useRef, useState, type FormEvent } from 'react'
import { Award, Eye, Upload } from 'lucide-react'
import { Button, Checkbox, ColorPicker, Input, Radio, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { scrollToFirstError } from '../ui/scrollToError'
import { CertificateTemplatePreviewModal } from './CertificateTemplatePreviewModal'
import { isLogoImage, KANVAS_LOGO, logoImageUrl, useDefaultLogo } from './logoImage'
import { api, errorMessage, type CertificateTemplate, type CertificateTemplateInput, type SignatureSlot } from '../../api'

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
  const [backgroundImage, setBackgroundImage] = useState<string | null>(template?.backgroundImage ?? null)
  const bgRef = useRef<HTMLInputElement>(null)
  const [bgBusy, setBgBusy] = useState(false)
  const [colors, setColors] = useState<string[]>(template?.colors ?? DEFAULT_COLORS)
  const [titleText, setTitleText] = useState(template?.titleText ?? 'CERTIFICATE OF COMPLETION')
  const [introText, setIntroText] = useState(template?.introText ?? 'This is to certify that')
  const [showPassScore, setShowPassScore] = useState(template?.showPassScore ?? true)
  const [slots, setSlots] = useState<SignatureSlot[]>(initialSlots(template))
  const [status, setStatus] = useState<CertificateTemplate['status']>(template?.status ?? 'Active')

  const [nameError, setNameError] = useState('')
  const [errors, setErrors] = useState<{ logo?: string; background?: string; titleText?: string; introText?: string; slots: Record<number, { title?: string; name?: string }> }>({ slots: {} })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const defaultFileRef = useRef<HTMLInputElement>(null)
  const { defaultLogo, upload: uploadDefault } = useDefaultLogo()
  const [defaultBusy, setDefaultBusy] = useState(false)

  // The company default logo can only be replaced, never removed (certificates always have a logo to fall back on).
  const changeDefaultLogo = async (file: File | undefined) => {
    if (!file) return
    setDefaultBusy(true)
    setErrors((p) => ({ ...p, logo: undefined }))
    try {
      await uploadDefault(file)
    } catch (err) {
      setErrors((p) => ({ ...p, logo: errorMessage(err) }))
    } finally {
      setDefaultBusy(false)
      if (defaultFileRef.current) defaultFileRef.current.value = ''
    }
  }

  const chooseLogo = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setErrors((p) => ({ ...p, logo: undefined }))
    try {
      const { coverImage } = await api.uploadCourseCover(file)
      setLogo(coverImage)
    } catch (err) {
      setErrors((p) => ({ ...p, logo: errorMessage(err) }))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const chooseBackground = async (file: File | undefined) => {
    if (!file) return
    setBgBusy(true)
    setErrors((p) => ({ ...p, background: undefined }))
    try {
      setBackgroundImage((await api.uploadCourseCover(file)).coverImage)
    } catch (err) {
      setErrors((p) => ({ ...p, background: errorMessage(err) }))
    } finally {
      setBgBusy(false)
      if (bgRef.current) bgRef.current.value = ''
    }
  }

  // The template as currently typed in the form, for the preview.
  const draftTemplate = (): CertificateTemplate => {
    const enabled = slots.filter((sl) => sl.enabled && sl.title.trim())
    return {
      id: template?.id ?? 0,
      name: name.trim() || 'New template',
      logo: customLogo && logo.trim() ? logo.trim() : DEFAULT_LOGO,
      backgroundImage,
      colors,
      signatures: enabled.map((sl) => sl.title.trim()),
      status,
      titleText: titleText.trim() || 'CERTIFICATE OF COMPLETION',
      introText: introText.trim() || 'This is to certify that',
      showPassScore,
      signatureDetails: slots,
    }
  }

  const setColor = (i: number, value: string) => setColors((prev) => prev.map((c, idx) => (idx === i ? value : c)))
  const setSlot = (i: number, patch: Partial<SignatureSlot>) =>
    setSlots((prev) => prev.map((sl, idx) => (idx === i ? { ...sl, ...patch } : sl)))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // ---- validate everything and show every problem at once
    let firstProblem = false
    const nextErrors: typeof errors = { slots: {} }
    if (!name.trim()) {
      setNameError('Template name is required.')
      firstProblem = true
    } else if (name.trim().length < 2) {
      setNameError('Template name must be at least 2 characters.')
      firstProblem = true
    } else if (name.trim().length > 100) {
      setNameError('Template name must be 100 characters or fewer.')
      firstProblem = true
    }
    if (customLogo && !logo.trim()) nextErrors.logo = 'Upload a logo image, or switch back to the company default logo.'
    if (!titleText.trim()) nextErrors.titleText = 'Title text is required.'
    if (!introText.trim()) nextErrors.introText = 'Intro text is required.'
    colors.forEach((c, i) => {
      if (!/^#[0-9a-f]{6}$/i.test(c)) nextErrors.slots[-1 - i] = { title: `${COLOR_LABELS[i]} must be a valid colour.` }
    })
    slots.forEach((sl, i) => {
      if (!sl.enabled) return
      const e: { title?: string; name?: string } = {}
      if (!sl.title.trim()) e.title = 'Enter the signatory title, or untick this signature.'
      if (sl.name.trim() && !/^[A-Za-z][A-Za-z .'-]*$/.test(sl.name.trim())) e.name = "Name can only contain letters, spaces, . - and '."
      if (e.title || e.name) nextErrors.slots[i] = e
    })
    if (!slots.some((sl) => sl.enabled && sl.title.trim())) nextErrors.slots[0] = { ...(nextErrors.slots[0] ?? {}), title: nextErrors.slots[0]?.title ?? 'Add at least one signature.' }
    setErrors(nextErrors)
    const hasSlotErrors = Object.keys(nextErrors.slots).length > 0
    if (firstProblem || nextErrors.logo || nextErrors.titleText || nextErrors.introText || hasSlotErrors) {
      setError('Please fix the highlighted fields.')
      scrollToFirstError(e.currentTarget as HTMLElement)
      return
    }
    setSaving(true)
    setError('')
    try {
      const cleanSlots = slots.map((sl) => ({ ...sl, title: sl.title.trim(), name: sl.name.trim() }))
      await onSave({
        name: name.trim(),
        logo: customLogo ? logo.trim() || DEFAULT_LOGO : DEFAULT_LOGO,
        backgroundImage,
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
      size="lg"
      tone="brand"
      icon={<Award size={20} />}
    >
      {/* Same popup size as the module form (860px wide, fixed minimum height), buttons pinned to the bottom. */}
      <form onSubmit={handleSubmit} noValidate className="d-flex flex-column" style={{ gap: 10, minHeight: 'min(678px, calc(100vh - 240px))' }}>
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
          {/* Both logo choices share one layout: the button first, then the preview (or a status line). */}
          <div className="mt-2 d-flex align-items-center gap-3 rounded-2 border p-2" style={{ background: '#faf8fd', minHeight: 56 }}>
            {customLogo ? (
              <>
                <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp" hidden onChange={(e) => void chooseLogo(e.target.files?.[0])} />
                <Button icon={<Upload size={14} />} loading={uploading} onClick={() => fileRef.current?.click()}>
                  {logo ? 'Replace logo' : 'Choose logo'}
                </Button>
                {logo && isLogoImage(logo) ? (
                  <img src={logoImageUrl(logo)} alt="Logo" style={{ height: 32, maxWidth: 160, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 13, color: '#7b6b94' }}>{logo || 'No file chosen'}</span>
                )}
              </>
            ) : (
              <>
                <input ref={defaultFileRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp" hidden onChange={(e) => void changeDefaultLogo(e.target.files?.[0])} />
                <Button icon={<Upload size={14} />} loading={defaultBusy} onClick={() => defaultFileRef.current?.click()}>
                  Replace logo
                </Button>
                {/* Until a different default is uploaded, the Kanvas logo is the company default. */}
                <img src={logoImageUrl(defaultLogo ?? KANVAS_LOGO)} alt="Default logo" style={{ height: 32, maxWidth: 160, objectFit: 'contain' }} />
              </>
            )}
          </div>
          {errors.logo && <div className="mt-1" data-field-error style={{ fontSize: 12, color: '#dc2626' }}>{errors.logo}</div>}
        </Field>

        <div className="row g-3">
          {colors.map((c, i) => (
            <div key={i} className="col-12 col-md-4">
              <Field label={COLOR_LABELS[i]} error={errors.slots[-1 - i]?.title}>
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

        <Field label="Background Image (optional)" error={errors.background}>
          <div className="d-flex align-items-center gap-3 rounded-2 border p-2" style={{ background: '#faf8fd' }}>
            <input ref={bgRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp" hidden onChange={(e) => void chooseBackground(e.target.files?.[0])} />
            <Button icon={<Upload size={14} />} loading={bgBusy} onClick={() => bgRef.current?.click()}>
              {backgroundImage ? 'Replace image' : 'Choose image'}
            </Button>
            {backgroundImage ? (
              <>
                <img src={logoImageUrl(backgroundImage)} alt="Background" style={{ height: 40, width: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2dcee' }} />
                <Button danger onClick={() => setBackgroundImage(null)}>
                  Remove
                </Button>
              </>
            ) : (
              <span style={{ fontSize: 13, color: '#7b6b94' }}>No image chosen</span>
            )}
          </div>
        </Field>

        <div className="row g-3">
          <div className="col-12 col-md-6">
                <Field label="Title Text" required error={errors.titleText}>
                  <Input value={titleText} onChange={(e) => { setTitleText(e.target.value); setErrors((p) => ({ ...p, titleText: undefined })) }} maxLength={120} status={errors.titleText ? 'error' : undefined} placeholder="Enter certificate title" />
                </Field>
          </div>
          <div className="col-12 col-md-6">
                <Field label="Intro Text" required error={errors.introText}>
                  <Input value={introText} onChange={(e) => { setIntroText(e.target.value); setErrors((p) => ({ ...p, introText: undefined })) }} maxLength={200} status={errors.introText ? 'error' : undefined} placeholder="Enter introduction text" />
                </Field>
          </div>
        </div>

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
                onChange={(e) => {
                  setSlot(i, { title: e.target.value })
                  setErrors((p) => ({ ...p, slots: { ...p.slots, [i]: { ...p.slots[i], title: undefined } } }))
                }}
                maxLength={80}
                status={errors.slots[i]?.title ? 'error' : undefined}
                placeholder="Enter signatory title"
              />
              {errors.slots[i]?.title && <div style={{ fontSize: 12, color: '#dc2626' }}>{errors.slots[i]?.title}</div>}
              <Input
                value={sl.name}
                disabled={!sl.enabled}
                onChange={(e) => {
                  setSlot(i, { name: e.target.value })
                  setErrors((p) => ({ ...p, slots: { ...p.slots, [i]: { ...p.slots[i], name: undefined } } }))
                }}
                maxLength={80}
                status={errors.slots[i]?.name ? 'error' : undefined}
                placeholder="Enter signatory name (optional)"
              />
              {errors.slots[i]?.name && <div style={{ fontSize: 12, color: '#dc2626' }}>{errors.slots[i]?.name}</div>}
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

        <div className="d-flex justify-content-end gap-3 pt-3 border-top mt-auto">
          <Button onClick={onClose}>Cancel</Button>
          <Button icon={<Eye size={14} />} onClick={() => setPreviewing(true)}>
            Preview
          </Button>
          <Button type="primary" htmlType="submit" loading={saving} disabled={uploading || bgBusy}>
            {saving ? 'Saving…' : template ? 'Save Changes' : 'Save Template'}
          </Button>
        </div>
      </form>
      {previewing && <CertificateTemplatePreviewModal template={draftTemplate()} onClose={() => setPreviewing(false)} />}
    </Modal>
  )
}
