import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, BookOpen, Check, Mail, Search, ShieldCheck, Receipt, UserCog } from 'lucide-react'
import { App, Button, Empty, Input, Select, Spin } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/State'
import { ReviewCard, ReviewRow } from '../components/tenants/ReviewParts'
import { CourseGroupPicker, ReviewCourseGroups } from '../components/tenants/CourseGroupPicker'
import { COUNTRIES } from '../data/countries'
import { useData, useDataNeeds } from '../context/DataContext'
import { api, errorMessage, type Tenant, type TenantCourse } from '../api'
import './CreateTenant.css'
import './CreateTenantPage.css'
import { WizardSteps } from '../components/tenants/WizardSteps'
import { scrollToFirstError } from '../components/ui/scrollToError'

const INDUSTRIES = ['IT Services', 'Manufacturing', 'Healthcare', 'Education', 'Retail', 'Finance', 'Other']
const UNLIMITED = 999_999
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/
const PHONE_RE = /^[0-9]{10}$/
const STEP_LABELS = ['Organization', 'Select courses', 'Review & proceed']
const LIMIT_PRESETS = [50, 100, 250, 500]

type Key = 'name' | 'userLimit' | 'billingContactName' | 'billingEmail' | 'billingPhone' | 'lmsAdminName' | 'lmsAdminEmail'
type Errors = Partial<Record<Key, string>>

/** Edit a tenant in the same three steps as creating one: Organization -> Courses -> Review. The tenant code
 *  can't change; every course, whatever its source, can be added or removed. */
function EditTenantForm({ tenant }: { tenant: Tenant }) {
  const navigate = useNavigate()
  const { courses, refresh } = useData()
  const onClose = () => navigate('/tenants')
  const onSaved = refresh
  const { notification } = App.useApp()
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

  // Courses this tenant already had when the page opened; anything selected beyond these is new and gets a star.
  const originalIds = new Set((current ?? []).map((c) => c.id))
  const isNew = (id: number) => current !== null && selected.includes(id) && !originalIds.has(id)
  const newCount = selected.filter((id) => isNew(id)).length
  // Every course can be ticked or unticked, including the ones the tenant already has: unticking an existing
  // course removes it from the tenant when the changes are saved. Existing courses stay visible (even if inactive).
  const activeCourses = courses.filter((c) => c.status === 'Active' || selected.includes(c.id) || originalIds.has(c.id))
  const removedCount = [...originalIds].filter((id) => !selected.includes(id)).length
  const categoryTypes = Array.from(new Set(activeCourses.map((c) => c.category)))
  const visible = activeCourses.filter(
    (c) =>
      (category === 'All' || c.category === category) &&
      (c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase())),
  )
  const selectedCourses = courses.filter((c) => selected.includes(c.id))

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const selectAllVisible = () => setSelected((prev) => Array.from(new Set([...prev, ...visible.map((c) => c.id)])))
  const clearAll = () => setSelected([])

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
      notification.success({ title: 'Tenant updated', description: `${name.trim()} was updated successfully.` })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }


  const requiredFilled = !!(name.trim() && billingEmail.trim() && lmsAdminName.trim() && lmsAdminEmail.trim())
  const nextLabel = step === 1 ? 'Next: Select courses' : step === 2 ? 'Next: Review' : 'Save changes'
  const limitNumber = userLimit.trim() ? Number(userLimit) : tenant.userLimit
  const initial = name.trim()[0]?.toUpperCase()
  const limitText = limitNumber >= UNLIMITED ? 'Unlimited' : Number.isFinite(limitNumber) && limitNumber > 0 ? `${limitNumber.toLocaleString()} users` : 'Not set'

  // The progress bar is clickable: going back is always allowed, going forward needs step 1 to be valid first.
  const goToStep = (n: number) => {
    if (n === step) return
    if (n > step && step === 1) {
      const errs = validate()
      setErrors(errs)
      if (Object.keys(errs).length > 0) {
        setError('Please fix the highlighted fields.')
        scrollToFirstError(document.querySelector('.tc-page'))
        return
      }
      setError('')
    }
    setStep(n)
  }

  return (
    <AppLayout title="Edit tenant" subtitle={`${tenant.name} · ${tenant.code}`} crumbs={[{ label: 'Tenants', to: '/tenants' }, { label: 'Edit tenant' }]}>
      <div className="tc-page">
        <button type="button" className="tc-back" onClick={onClose}>
          <ArrowLeft size={15} /> Back to tenants
        </button>
        <div className="tc-title-row">
          <div>
            <h2 className="font-display tc-title">Edit tenant</h2>
            <p className="tc-sub">Update the organization, billing contact and LMS administrator for {tenant.name}.</p>
          </div>
          <span className="tc-required">
            <b>*</b> Required
          </span>
        </div>

        <div className="tc-stepper">
          <WizardSteps
            steps={STEP_LABELS}
            current={step}
            onStepClick={goToStep}
            captions={['Profile, billing & admin', 'Add courses to the catalog', 'Confirm and save']}
          />
        </div>

        {step === 1 && (
          <div className="tc-grid">
            <div className="tc-main">
              {error && <Notice tone="error">{error}</Notice>}
              <section className="tc-card">
                <div className="tc-card-head">
                  <span className="tc-card-icon">
                    <Building2 size={20} />
                  </span>
                  <div>
                    <h3 className="tc-card-title">Organization</h3>
                    <p className="tc-card-desc">Who this tenant is and how many people can use it.</p>
                  </div>
                </div>
                <div className="tc-fields">
                  <Field label="Organization name" required error={errors.name}>
                    <Input
                      size="middle"
                      value={name}
                      maxLength={200}
                      status={status('name')}
                      onChange={(e) => {
                        setName(e.target.value)
                        clear('name')
                      }}
                      placeholder="e.g. Acme Industries"
                    />
                  </Field>
                  <Field label="Tenant code" hint="Can't be changed after creation.">
                    <Input size="middle" className="tc-mono" value={tenant.code} disabled />
                  </Field>
                  <Field label="Industry">
                    <Select
                      size="middle"
                      value={industry}
                      onChange={setIndustry}
                      options={[...new Set([...INDUSTRIES, industry])].map((i) => ({ value: i, label: i }))}
                      style={{ width: '100%' }}
                    />
                  </Field>
                  <Field label="Country">
                    <Select
                      size="middle"
                      showSearch
                      value={country || undefined}
                      onChange={setCountry}
                      options={[...new Set([...COUNTRIES, country].filter(Boolean))].map((c) => ({ value: c, label: c }))}
                      optionFilterProp="label"
                      placeholder="Select country"
                      style={{ width: '100%' }}
                    />
                  </Field>
                  <div>
                  <Field
                      label="User limit"
                      error={errors.userLimit}
                      hint={tenant.userLimit >= UNLIMITED ? 'Currently unlimited. Leave blank to keep it.' : `${tenant.users} users active now. You can raise the limit any time.`}
                    >
                      <div className="tc-limit">
                        {LIMIT_PRESETS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={`tc-limit-pick${userLimit === String(n) ? ' is-active' : ''}`}
                            onClick={() => {
                              setUserLimit(String(n))
                              clear('userLimit')
                            }}
                          >
                            {n}
                          </button>
                        ))}
                        <span className="tc-limit-or">or</span>
                        <Input
                          size="middle"
                          type="number"
                          min={1}
                          value={userLimit}
                          status={status('userLimit')}
                          onChange={(e) => {
                            setUserLimit(e.target.value)
                            clear('userLimit')
                          }}
                          style={{ width: 120 }}
                        />
                        <span className="tc-limit-unit">users</span>
                      </div>
                    </Field>
                  </div>
                  <div>
                    <Field
                      label={
                        <>
                          Address <span className="tc-opt">(optional)</span>
                        </>
                      }
                    >
                      <Input size="middle" maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, state, PIN" />
                    </Field>
                  </div>
                </div>
              </section>

              <section className="tc-card">
                <div className="tc-card-head">
                  <span className="tc-card-icon">
                    <Receipt size={20} />
                  </span>
                  <div>
                    <h3 className="tc-card-title">Billing contact</h3>
                    <p className="tc-card-desc">Where invoices and renewal reminders go.</p>
                  </div>
                </div>
                <div className="tc-fields">
                  <Field
                    label={
                      <>
                        Contact name <span className="tc-opt">(optional)</span>
                      </>
                    }
                    error={errors.billingContactName}
                  >
                    <Input
                      size="middle"
                      value={billingContactName}
                      maxLength={120}
                      status={status('billingContactName')}
                      onChange={(e) => {
                        setBillingContactName(e.target.value)
                        clear('billingContactName')
                      }}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Billing email" required error={errors.billingEmail}>
                    <Input
                      size="middle"
                      type="email"
                      value={billingEmail}
                      status={status('billingEmail')}
                      onChange={(e) => {
                        setBillingEmail(e.target.value)
                        clear('billingEmail')
                      }}
                      placeholder="billing@company.com"
                    />
                  </Field>
                  <Field
                    label={
                      <>
                        Phone <span className="tc-opt">(optional)</span>
                      </>
                    }
                    error={errors.billingPhone}
                  >
                    <Input
                      size="middle"
                      addonBefore="+91"
                      inputMode="tel"
                      maxLength={10}
                      value={billingPhone}
                      status={status('billingPhone')}
                      onChange={(e) => {
                        setBillingPhone(e.target.value.replace(/\D/g, ''))
                        clear('billingPhone')
                      }}
                      placeholder="98765 43210"
                    />
                  </Field>
                </div>
              </section>

              <section className="tc-card">
                <div className="tc-card-head">
                  <span className="tc-card-icon">
                    <UserCog size={20} />
                  </span>
                  <div>
                    <h3 className="tc-card-title">LMS administrator</h3>
                    <p className="tc-card-desc">The person who manages courses and users for this tenant.</p>
                  </div>
                </div>
                <div className="tc-fields">
                  <Field label="Admin name" required error={errors.lmsAdminName}>
                    <Input
                      size="middle"
                      value={lmsAdminName}
                      maxLength={120}
                      status={status('lmsAdminName')}
                      onChange={(e) => {
                        setLmsAdminName(e.target.value)
                        clear('lmsAdminName')
                      }}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Admin email" required error={errors.lmsAdminEmail}>
                    <Input
                      size="middle"
                      type="email"
                      value={lmsAdminEmail}
                      status={status('lmsAdminEmail')}
                      onChange={(e) => {
                        setLmsAdminEmail(e.target.value)
                        clear('lmsAdminEmail')
                      }}
                      placeholder="admin@company.com"
                    />
                  </Field>
                </div>
              </section>
            </div>

            <aside className="tc-aside">
              <div className="tc-preview">
                <p className="tc-preview-label">Tenant preview</p>
                <div className="tc-preview-id">
                  <span className="tc-preview-avatar">{initial ?? '–'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className={`tc-preview-name${name.trim() ? '' : ' is-empty'}`}>{name.trim() || 'Organization name'}</div>
                    <span className="tc-preview-code">{tenant.code.toUpperCase()}</span>
                  </div>
                </div>
                <div className="tc-preview-row">
                  <span>User limit</span>
                  <span>{limitText}</span>
                </div>
                <div className="tc-preview-row">
                  <span>Industry</span>
                  <span>{industry || 'Not set'}</span>
                </div>
                <div className="tc-preview-row">
                  <span>Billing Email</span>
                  <span>{billingEmail.trim() || 'Not set'}</span>
                </div>
                <div className="tc-preview-row">
                  <span>Admin Email</span>
                  <span>{lmsAdminEmail.trim() || 'Not set'}</span>
                </div>
              </div>
            </aside>
          </div>
        )}

        {step === 2 && (
          <div className="tc-step-card">
            {error && (
              <div className="mb-3">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
              <div>
                <h3 className="mb-1 font-display fs-5 fw-bold text-dark">Select Courses</h3>
                <p className="mb-0 small text-secondary">
                  Tick a course to add it, untick one to remove it from this tenant. Changes apply when you save.
                </p>
              </div>
              <span className="ct-selected-pill">
                <Check size={14} /> {selected.length} selected{newCount > 0 ? ` · ${newCount} new` : ''}{removedCount > 0 ? ` · ${removedCount} removed` : ''}
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
                    <Button onClick={clearAll}>Clear</Button>
                  </div>
                </div>


                {visible.length === 0 ? (
                  <div className="py-5">
                    <Empty description="No courses match your filters." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                ) : (
                  <CourseGroupPicker courses={visible} selected={selected} isNew={isNew} onToggle={toggle} />
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="tc-step-card">
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
                    <ReviewCourseGroups courses={selectedCourses} isNew={isNew} />
                  )}
                  {removedCount > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #e2dcee' }}>
                      <p className="mb-2 fw-semibold" style={{ fontSize: 13, color: '#b42318' }}>
                        Will be removed ({removedCount})
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {courses
                          .filter((c) => originalIds.has(c.id) && !selected.includes(c.id))
                          .map((c) => (
                            <span key={c.id} className="ct-review-chip" style={{ background: '#fdecea', color: '#b42318', textDecoration: 'line-through' }}>
                              {c.name}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </ReviewCard>
              </div>
            </div>
          </div>
          </div>
        )}

        <div className="tc-footer">
          <Button type={step === 1 ? 'text' : 'default'} onClick={step === 1 ? onClose : () => setStep((s) => s - 1)} disabled={saving}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            type="primary"
            className={`tc-next${step === 1 && !requiredFilled ? ' is-pale' : ''}`}
            loading={saving}
            onClick={() => (step < 3 ? next() : void save())}
            style={step === 1 && !requiredFilled ? undefined : { background: 'linear-gradient(135deg, #5c2d91, #7b3fa0)', border: 'none' }}
          >
            {saving ? 'Saving…' : nextLabel} {step < 3 && <ArrowRight size={15} />}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

export default function EditTenant() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenants } = useData()
  useDataNeeds('tenants', 'courses', 'courseOptions')
  const tenant = tenants.find((t) => String(t.id) === id)
  if (!tenant) {
    return (
      <AppLayout title="Edit Tenant" subtitle="">
        <Button type="text" icon={<ArrowLeft size={16} />} onClick={() => navigate('/tenants')}>
          Back to Tenants
        </Button>
        <div className="py-5 text-center">
          <Spin />
        </div>
      </AppLayout>
    )
  }
  return <EditTenantForm key={tenant.id} tenant={tenant} />
}
