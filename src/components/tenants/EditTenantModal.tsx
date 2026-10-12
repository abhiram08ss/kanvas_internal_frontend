import { useEffect, useState } from 'react'
import { Building2, BookOpen, Check, Lock, Mail, Search, ShieldCheck } from 'lucide-react'
import { Button, Empty, Input, Select, Spin, Steps } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { ReviewCard, ReviewRow } from './ReviewParts'
import { COUNTRIES } from '../../data/countries'
import { useData } from '../../context/DataContext'
import { api, errorMessage, API_ORIGIN, type Tenant, type TenantCourse } from '../../api'
import '../../pages/CreateTenant.css'

const INDUSTRIES = ['IT Services', 'Manufacturing', 'Healthcare', 'Education', 'Retail', 'Finance', 'Other']
const UNLIMITED = 999_999
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/
const PHONE_RE = /^[0-9]{10}$/
const STEP_LABELS = ['Organization', 'Select Courses', 'Review & Proceed']
const KANVAS_GRADIENT = 'linear-gradient(135deg, #5c2d91, #7b3fa0)'

type Key = 'name' | 'userLimit' | 'billingContactName' | 'billingEmail' | 'billingPhone' | 'lmsAdminName' | 'lmsAdminEmail'
type Errors = Partial<Record<Key, string>>

/** Edit a tenant in the same three steps as creating one: Organization -> Courses -> Review. The tenant code
 *  can't change, and courses that came with the tenant's plan or a purchase stay locked on. */
export function EditTenantModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: () => Promise<void> }) {
  const { courses } = useData()
  const [step, setStep] = useState(1)

  // Step 1
  const [name, setName] = useState(tenant.name)
  const [industry, setIndustry] = useState(tenant.industry)
  const [country, setCountry] = useState(tenant.country)
  const [address, setAddress] = useState(tenant.address)
  const [userLimit, setUserLimit] = useState(tenant.userLimit >= UNLIMITED ? '' : String(tenant.userLimit))
  const [billingContactName, setBillingContactName] = useState(tenant.billingContactName)
  const [billingEmail, setBillingEmail] = useState(tenant.billingEmail)
  const [billingPhone, setBillingPhone] = useState(tenant.billingPhone)
  const [lmsAdminName, setLmsAdminName] = useState(tenant.lmsAdminName)
  const [lmsAdminEmail, setLmsAdminEmail] = useState(tenant.lmsAdminEmail)
  const [errors, setErrors] = useState<Errors>({})

  // Step 2
  const [current, setCurrent] = useState<TenantCourse[] | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .tenantDetail(tenant.id)
      .then((d) => {
        if (cancelled) return
        setCurrent(d.courses)
        setSelected(d.courses.map((c) => c.id))
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [tenant.id])

  const lockedIds = new Set((current ?? []).filter((c) => c.source !== 'assigned').map((c) => c.id))
  const activeCourses = courses.filter((c) => c.status === 'Active' || selected.includes(c.id))
  const categoryTypes = Array.from(new Set(activeCourses.map((c) => c.category)))
  const visible = activeCourses.filter(
    (c) =>
      (category === 'All' || c.category === category) &&
      (c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase())),
  )
  const selectedCourses = courses.filter((c) => selected.includes(c.id))

  const toggle = (id: number) => {
    if (lockedIds.has(id)) return
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const selectAllVisible = () => setSelected((prev) => Array.from(new Set([...prev, ...visible.map((c) => c.id)])))
  const clearAssigned = () => setSelected((prev) => prev.filter((id) => lockedIds.has(id)))

  const clear = (key: Key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  const status = (key: Key) => (errors[key] ? 'error' : undefined)

  const validate = (): Errors => {
    const e: Errors = {}
    if (!name.trim()) e.name = 'Organization name is required.'
    else if (name.trim().length > 200) e.name = 'Organization name must be 200 characters or fewer.'
    if (userLimit.trim()) {
      const n = Number(userLimit)
      if (!Number.isInteger(n) || n < 1) e.userLimit = 'Enter a whole number of 1 or more.'
      else if (n < tenant.users) e.userLimit = `Cannot be below the current ${tenant.users} active users.`
    }
    if (billingContactName.trim() && !NAME_RE.test(billingContactName.trim())) e.billingContactName = "Name can only contain letters, spaces, . - and '"
    if (!billingEmail.trim()) e.billingEmail = 'Billing email is required.'
    else if (!EMAIL_RE.test(billingEmail.trim())) e.billingEmail = 'Enter a valid email address.'
    if (billingPhone.trim() && !PHONE_RE.test(billingPhone.trim())) e.billingPhone = 'Phone number must be exactly 10 digits.'
    if (!lmsAdminName.trim()) e.lmsAdminName = 'Admin name is required.'
    else if (!NAME_RE.test(lmsAdminName.trim())) e.lmsAdminName = "Name can only contain letters, spaces, . - and '"
    if (!lmsAdminEmail.trim()) e.lmsAdminEmail = 'Admin email is required.'
    else if (!EMAIL_RE.test(lmsAdminEmail.trim())) e.lmsAdminEmail = 'Enter a valid email address.'
    return e
  }

  const next = () => {
    if (step === 1) {
      const errs = validate()
      setErrors(errs)
      if (Object.keys(errs).length > 0) {
        setError('Please fix the highlighted fields.')
        return
      }
      setError('')
    }
    setStep((s) => Math.min(3, s + 1))
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await api.updateTenant(tenant.id, {
        name: name.trim(),
        industry,
        country,
        address,
        billingContactName: billingContactName.trim(),
        billingEmail: billingEmail.trim(),
        billingPhone: billingPhone.trim(),
        lmsAdminName: lmsAdminName.trim(),
        lmsAdminEmail: lmsAdminEmail.trim(),
        ...(userLimit.trim() ? { userLimit: Number(userLimit) } : {}),
        courseIds: selected,
      })
      await onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  const stepItems = STEP_LABELS.map((label, i) => {
    const n = i + 1
    const filled = n <= step
    return {
      title: label,
      icon: (
        <span className="ct-step-dot" style={{ background: filled ? KANVAS_GRADIENT : '#f0e8fa', color: filled ? '#fff' : '#9b87b5' }}>
          {n < step ? <Check size={16} /> : n}
        </span>
      ),
    }
  })

  const footer = (
    <div className="d-flex justify-content-between">
          <Button size="large" onClick={step === 1 ? onClose : () => setStep((s) => s - 1)} disabled={saving}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button type="primary" size="large" onClick={next}>
              Next
            </Button>
          ) : (
            <Button type="primary" size="large" loading={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
        </div>
  )

  return (
    <Modal title="Edit tenant" subtitle={`${tenant.name} · ${tenant.code}`} onClose={onClose} size="xl" tone="brand" icon={<Building2 size={20} />} footer={footer}>
      <div className="ct-wizard-card ct-edit">
        <div className="ct-edit-steps">
          <Steps current={step - 1} items={stepItems} titlePlacement="vertical" />
        </div>

        <div>
        {error && (
          <div className="mb-3">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        {step === 1 && (
          <div className="mx-auto" style={{ maxWidth: 640 }}>
            <h3 className="font-display fs-6 fw-bold text-dark mb-3">Organization Information</h3>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Field label="Organization Name" required error={errors.name}>
                  <Input size="large" value={name} maxLength={200} status={status('name')} onChange={(e) => { setName(e.target.value); clear('name') }} placeholder="Enter organization name" />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Tenant Code" hint="Can't be changed after creation.">
                  <Input size="large" value={tenant.code} disabled />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Industry">
                  <Select size="large" value={industry} onChange={setIndustry} options={[...new Set([...INDUSTRIES, industry])].map((i) => ({ value: i, label: i }))} style={{ width: '100%' }} />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Country">
                  <Select
                    size="large"
                    showSearch
                    value={country || undefined}
                    onChange={setCountry}
                    options={[...new Set([...COUNTRIES, country].filter(Boolean))].map((c) => ({ value: c, label: c }))}
                    optionFilterProp="label"
                    placeholder="Select country"
                    style={{ width: '100%' }}
                  />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="User Limit" error={errors.userLimit} hint={tenant.userLimit >= UNLIMITED ? 'Currently unlimited. Leave blank to keep it.' : `${tenant.users} users active now.`}>
                  <Input size="large" type="number" min={1} value={userLimit} status={status('userLimit')} onChange={(e) => { setUserLimit(e.target.value); clear('userLimit') }} placeholder="Enter user limit" />
                </Field>
              </div>
              <div className="col-12">
                <Field label="Address">
                  <Input.TextArea rows={2} maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter full address" />
                </Field>
              </div>
            </div>

            <h3 className="font-display fs-6 fw-bold text-dark mt-4 mb-3 pt-3 border-top">Billing Contact Details</h3>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <Field label="Contact Name" error={errors.billingContactName}>
                  <Input size="large" value={billingContactName} maxLength={120} status={status('billingContactName')} onChange={(e) => { setBillingContactName(e.target.value); clear('billingContactName') }} placeholder="Enter contact name" />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Billing Email" required error={errors.billingEmail}>
                  <Input size="large" type="email" value={billingEmail} status={status('billingEmail')} onChange={(e) => { setBillingEmail(e.target.value); clear('billingEmail') }} placeholder="Enter billing email" />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Phone" error={errors.billingPhone}>
                  <Input size="large" inputMode="tel" maxLength={10} value={billingPhone} status={status('billingPhone')} onChange={(e) => { setBillingPhone(e.target.value.replace(/\D/g, '')); clear('billingPhone') }} placeholder="Enter 10-digit phone number" />
                </Field>
              </div>
            </div>

            <h3 className="font-display fs-6 fw-bold text-dark mt-4 mb-3 pt-3 border-top">LMS Admin Details</h3>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Field label="Admin Name" required error={errors.lmsAdminName}>
                  <Input size="large" value={lmsAdminName} maxLength={120} status={status('lmsAdminName')} onChange={(e) => { setLmsAdminName(e.target.value); clear('lmsAdminName') }} placeholder="Enter admin name" />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Admin Email" required error={errors.lmsAdminEmail}>
                  <Input size="large" type="email" value={lmsAdminEmail} status={status('lmsAdminEmail')} onChange={(e) => { setLmsAdminEmail(e.target.value); clear('lmsAdminEmail') }} placeholder="Enter admin email" />
                </Field>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
              <div>
                <h3 className="mb-1 font-display fs-5 fw-bold text-dark">Select Courses</h3>
                <p className="mb-0 small text-secondary">Choose which published courses this tenant should have access to.</p>
              </div>
              <span className="ct-selected-pill">
                <Check size={14} /> {selected.length} selected
              </span>
            </div>

            {!current && !error ? (
              <div className="py-5 text-center">
                <Spin />
              </div>
            ) : (
              <>
                <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                  <div style={{ width: 280, maxWidth: '100%' }}>
                    <Input allowClear value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses" prefix={<Search size={14} color="#9b87b5" />} />
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {['All', ...categoryTypes].map((cat) => (
                      <button key={cat} type="button" className={`ct-chip${category === cat ? ' is-active' : ''}`} onClick={() => setCategory(cat)}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="ms-auto d-flex gap-2">
                    <Button onClick={selectAllVisible} disabled={visible.length === 0}>
                      Select all{category !== 'All' || query ? ' shown' : ''}
                    </Button>
                    <Button onClick={clearAssigned}>Clear</Button>
                  </div>
                </div>

                {lockedIds.size > 0 && (
                  <p className="small mb-3" style={{ color: '#727587' }}>
                    <Lock size={12} className="me-1" /> Courses that came with the tenant's plan or a purchase are locked and can't be removed here.
                  </p>
                )}

                {visible.length === 0 ? (
                  <div className="py-5">
                    <Empty description="No courses match your filters." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                ) : (
                  <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
                    {visible.map((c) => {
                      const checked = selected.includes(c.id)
                      const locked = lockedIds.has(c.id)
                      return (
                        <div key={c.id} className="col">
                          <div
                            role="checkbox"
                            aria-checked={checked}
                            aria-disabled={locked}
                            tabIndex={0}
                            className={`ct-course-card${checked ? ' is-selected' : ''}${locked ? ' is-locked' : ''}`}
                            onClick={() => toggle(c.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                toggle(c.id)
                              }
                            }}
                          >
                            {c.coverImage ? (
                              <img src={`${API_ORIGIN}/courses/covers/${c.coverImage}`} alt="" className="ct-course-thumb" />
                            ) : (
                              <div className="ct-course-thumb ct-course-thumb-empty">
                                <BookOpen size={20} color="#fff" />
                              </div>
                            )}
                            <div className="flex-grow-1 min-w-0">
                              <div className="ct-course-name text-truncate" title={c.name}>
                                {c.name}
                              </div>
                              <div className="ct-course-meta text-truncate">
                                {c.code} · {c.category}
                              </div>
                            </div>
                            <span className="ct-course-check">{locked ? <Lock size={12} /> : checked && <Check size={14} />}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="mx-auto" style={{ maxWidth: 920 }}>
            <h3 className="mb-1 font-display fs-5 fw-bold text-dark">Review &amp; Proceed</h3>
            <p className="mb-4 small text-secondary">Check the changes below. Click Save Changes to update the tenant.</p>
            <div className="row g-3">
              <div className="col-12 col-lg-6">
                <ReviewCard icon={<Building2 size={18} />} title="Organization">
                  <ReviewRow label="Name" value={name} />
                  <ReviewRow label="Tenant code" value={tenant.code} mono />
                  <ReviewRow label="Industry" value={industry} />
                  <ReviewRow label="Country" value={country} />
                  <ReviewRow label="User limit" value={userLimit || (tenant.userLimit >= UNLIMITED ? 'Unlimited' : String(tenant.userLimit))} />
                  <ReviewRow label="Address" value={address} />
                </ReviewCard>
              </div>
              <div className="col-12 col-lg-6 d-flex flex-column gap-3">
                <ReviewCard icon={<Mail size={18} />} title="Billing contact">
                  <ReviewRow label="Name" value={billingContactName} />
                  <ReviewRow label="Email" value={billingEmail} />
                  <ReviewRow label="Phone" value={billingPhone} />
                </ReviewCard>
                <ReviewCard icon={<ShieldCheck size={18} />} title="LMS admin">
                  <ReviewRow label="Name" value={lmsAdminName} />
                  <ReviewRow label="Email" value={lmsAdminEmail} />
                </ReviewCard>
              </div>
              <div className="col-12">
                <ReviewCard icon={<BookOpen size={18} />} title={`Courses (${selectedCourses.length})`}>
                  {selectedCourses.length === 0 ? (
                    <p className="small text-secondary mb-0">No courses selected.</p>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {selectedCourses.map((c) => (
                        <span key={c.id} className="ct-review-chip">
                          <Check size={13} /> {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </ReviewCard>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </Modal>
  )
}
