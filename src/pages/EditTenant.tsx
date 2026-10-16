import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, Check, Copy, Globe, Receipt, UserCog } from 'lucide-react'
import { App, Button, Input, Select, Spin } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/State'
import { ReviewStep } from '../components/tenants/ReviewStep'
import { CourseSelectStep } from '../components/tenants/CourseSelectStep'
import { TenantStatusCard, suspendReasonText, type TenantStatusChoice } from '../components/tenants/TenantStatusCard'
import { CountrySelect } from '../components/ui/CountrySelect'
import { PhoneField } from '../components/ui/PhoneField'
import { displayPhone, parseStoredPhone, toStoredPhone, validatePhone, type PhoneParts } from '../utils/phone'
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
const STEP_LABELS = ['Organization', 'Select courses', 'Review & proceed']
const LIMIT_PRESETS = [50, 100, 250, 500]

type Key = 'name' | 'userLimit' | 'address' | 'billingContactName' | 'billingEmail' | 'billingPhone' | 'lmsAdminName' | 'lmsAdminEmail' | 'statusReason'
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
  const [phone, setPhone] = useState<PhoneParts>(parseStoredPhone(tenant.billingPhone))
  const billingPhone = phone.national
  const [lmsAdminName, setLmsAdminName] = useState(tenant.lmsAdminName)
  const [lmsAdminEmail, setLmsAdminEmail] = useState(tenant.lmsAdminEmail)
  const [errors, setErrors] = useState<Errors>({})
  const initialStatus: TenantStatusChoice = tenant.status === 'Suspended' ? 'Suspended' : 'Active'
  const [tenantStatus, setTenantStatus] = useState<TenantStatusChoice>(initialStatus)
  const [statusReason, setStatusReason] = useState('')
  const [statusNote, setStatusNote] = useState('')

  // Step 2
  const [current, setCurrent] = useState<TenantCourse[] | null>(null)
  const [lmsUrl, setLmsUrl] = useState('')
  const [urlCopied, setUrlCopied] = useState(false)
  const [selected, setSelected] = useState<number[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .tenantDetail(tenant.id)
      .then((d) => {
        if (cancelled) return
        setCurrent(d.courses)
        setLmsUrl(d.lmsUrl ?? '')
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
  // Every course can be ticked or unticked, including the ones the tenant already has: unticking an existing
  // course removes it from the tenant when the changes are saved. Existing courses stay visible (even if inactive).
  const activeCourses = courses.filter((c) => c.status === 'Active' || selected.includes(c.id) || originalIds.has(c.id))
  const removedCount = [...originalIds].filter((id) => !selected.includes(id)).length
  const selectedCourses = courses.filter((c) => selected.includes(c.id))

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
    if (!address.trim()) e.address = 'Address is required.'
    else if (address.trim().length < 5) e.address = 'Enter the full address (at least 5 characters).'
    if (!billingContactName.trim()) e.billingContactName = 'Billing name is required.'
    else if (!NAME_RE.test(billingContactName.trim())) e.billingContactName = "Name can only contain letters, spaces, . - and '"
    if (!billingEmail.trim()) e.billingEmail = 'Billing email is required.'
    else if (!EMAIL_RE.test(billingEmail.trim())) e.billingEmail = 'Enter a valid email address.'
    const phoneProblem = validatePhone(phone)
    if (phoneProblem) e.billingPhone = phoneProblem
    if (!lmsAdminName.trim()) e.lmsAdminName = 'Admin name is required.'
    else if (!NAME_RE.test(lmsAdminName.trim())) e.lmsAdminName = "Name can only contain letters, spaces, . - and '"
    if (!lmsAdminEmail.trim()) e.lmsAdminEmail = 'Admin email is required.'
    else if (!EMAIL_RE.test(lmsAdminEmail.trim())) e.lmsAdminEmail = 'Enter a valid email address.'
    if (tenantStatus === 'Suspended' && tenantStatus !== initialStatus && !statusReason) e.statusReason = 'Select a reason for suspending this tenant.'
    return e
  }

  const next = () => {
    if (step === 1) {
      const errs = validate()
      setErrors(errs)
      if (Object.keys(errs).length > 0) {
        setError('Please fix the highlighted fields.')
        scrollToFirstError(document.querySelector('.tc-page'))
        return
      }
      setError('')
    }
    setStep((s) => Math.min(3, s + 1))
  }

  const save = async () => {
    if (saving) return
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
        billingPhone: toStoredPhone(phone),
        lmsAdminName: lmsAdminName.trim(),
        lmsAdminEmail: lmsAdminEmail.trim(),
        ...(userLimit.trim() ? { userLimit: Number(userLimit) } : {}),
        courseIds: selected,
      })
      if (tenantStatus !== initialStatus) {
        await api.setTenantStatus(tenant.id, tenantStatus, tenantStatus === 'Suspended' ? suspendReasonText(statusReason, statusNote) : undefined)
      }
      await onSaved()
      notification.success({ title: 'Tenant Updated', description: `${name.trim()} was updated successfully.` })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }


  const requiredFilled = !!(name.trim() && address.trim() && billingContactName.trim() && billingEmail.trim() && billingPhone.trim() && lmsAdminName.trim() && lmsAdminEmail.trim())
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
        <div className="tc-title-row">
          <button type="button" className="tc-back" onClick={onClose}>
            <span className="tc-back-ico">
              <ArrowLeft size={14} />
            </span>
            Back to tenants
          </button>
          <div className="tc-hero">
            <span className="tc-hero-icon">
              <Building2 size={22} />
            </span>
            <div className="tc-hero-text">
              <h2 className="font-display tc-title">Edit tenant</h2>
              <p className="tc-sub">{step === 2 ? "Pick the courses this tenant's learners will get. Untick a course to remove it." : step === 3 ? 'Check the changes below, then save.' : `Update the organization, billing contact and LMS administrator for ${tenant.name}.`}</p>
            </div>
            <span className="tc-required">
              <b>*</b> Required fields
            </span>
          </div>
        </div>

        <div className="tc-stepper">
          <WizardSteps
            variant="dots"
            jumpAnywhere
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
                <div className="tc-fields tc-fields-4">
                  <Field label="Organization Name" required error={errors.name}>
                    <Input
                      size="middle"
                      value={name}
                      maxLength={200}
                      status={status('name')}
                      onChange={(e) => {
                        setName(e.target.value)
                        clear('name')
                      }}
                      placeholder="Enter organization name"
                    />
                  </Field>
                  <Field label="Tenant Code" hint="Can't be changed after creation.">
                    <Input size="middle" className="tc-mono" value={tenant.code} disabled />
                  </Field>
                  <Field label="Industry">
                    <Select
                      size="middle" showSearch optionFilterProp="label" notFoundContent="No matches found"
                      value={industry}
                      onChange={setIndustry}
                      options={[...new Set([...INDUSTRIES, industry])].map((i) => ({ value: i, label: i }))}
                      style={{ width: '100%' }}
                    />
                  </Field>
                  <Field label="Country">
                    <CountrySelect size="middle" value={country} onChange={setCountry} />
                  </Field>
                  <div className="tc-span2">
                  <Field
                      label="User Limit"
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
                  <div className="tc-span2">
                    <Field label="Address" required error={errors.address}>
                      <Input.TextArea
                        rows={2}
                        maxLength={300}
                        value={address}
                        status={status('address')}
                        onChange={(e) => {
                          setAddress(e.target.value)
                          clear('address')
                        }}
                        placeholder="Enter the full address: street, city, state and PIN code"
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <div className="tc-pair">
                <section className="tc-card">
                  <div className="tc-card-head">
                    <span className="tc-card-icon">
                      <Receipt size={20} />
                    </span>
                    <div>
                      <h3 className="tc-card-title">Billing Contact</h3>
                      <p className="tc-card-desc">Where invoices and renewal reminders go.</p>
                    </div>
                  </div>
                  <div className="tc-fields">
                    <Field label="Billing Name" required error={errors.billingContactName}>
                      <Input
                        size="middle"
                        value={billingContactName}
                        maxLength={120}
                        status={status('billingContactName')}
                        onChange={(e) => {
                          setBillingContactName(e.target.value)
                          clear('billingContactName')
                        }}
                        placeholder="Enter billing contact name"
                      />
                    </Field>
                    <Field label="Billing Email" required error={errors.billingEmail}>
                      <Input
                        size="middle"
                        type="email"
                        value={billingEmail}
                        status={status('billingEmail')}
                        onChange={(e) => {
                          setBillingEmail(e.target.value)
                          clear('billingEmail')
                        }}
                        placeholder="Enter billing email address"
                      />
                    </Field>
                    <div>
                      <Field label="Contact Number" required error={errors.billingPhone}>
                      <PhoneField
                        value={phone}
                        status={status('billingPhone')}
                        onChange={(v) => {
                          setPhone(v)
                          clear('billingPhone')
                        }}
                      />
                    </Field>
                    </div>
                  </div>
                </section>

                <section className="tc-card">
                  <div className="tc-card-head">
                    <span className="tc-card-icon">
                      <UserCog size={20} />
                    </span>
                    <div>
                      <h3 className="tc-card-title">LMS Administrator</h3>
                      <p className="tc-card-desc">The person who manages courses and users for this tenant.</p>
                    </div>
                  </div>
                  <div className="tc-fields">
                    <Field label="Admin Name" required error={errors.lmsAdminName}>
                      <Input
                        size="middle"
                        value={lmsAdminName}
                        maxLength={120}
                        status={status('lmsAdminName')}
                        onChange={(e) => {
                          setLmsAdminName(e.target.value)
                          clear('lmsAdminName')
                        }}
                        placeholder="Enter admin name"
                      />
                    </Field>
                    <Field label="Admin Email" required error={errors.lmsAdminEmail}>
                      <Input
                        size="middle"
                        type="email"
                        value={lmsAdminEmail}
                        status={status('lmsAdminEmail')}
                        onChange={(e) => {
                          setLmsAdminEmail(e.target.value)
                          clear('lmsAdminEmail')
                        }}
                        placeholder="Enter admin email address"
                      />
                    </Field>
                  <div>
                    <Field label="Tenant URL">
                      <div className="tc-url">
                        <Globe size={14} />
                        <span>{lmsUrl || 'https://[tenant-url]'}</span>
                        <button
                          type="button"
                          className="tc-url-copy"
                          aria-label="Copy tenant URL"
                          disabled={!lmsUrl}
                          onClick={() => {
                            void navigator.clipboard?.writeText(lmsUrl).then(() => {
                              setUrlCopied(true)
                              window.setTimeout(() => setUrlCopied(false), 1500)
                            })
                          }}
                        >
                          {urlCopied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </Field>
                  </div>
                  </div>
                </section>
              </div>
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
                  <span>User Limit</span>
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
              <TenantStatusCard
                status={tenantStatus}
                onStatusChange={(v) => {
                  setTenantStatus(v)
                  clear('statusReason')
                }}
                reason={statusReason}
                onReasonChange={(r) => {
                  setStatusReason(r)
                  clear('statusReason')
                }}
                note={statusNote}
                onNoteChange={setStatusNote}
                reasonError={errors.statusReason}
              />
            </aside>
          </div>
        )}

        {step === 2 && (
          <>
            {error && (
              <div className="mb-3">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
            {!current && !error ? (
              <div className="py-5 text-center">
                <Spin />
              </div>
            ) : (
              <CourseSelectStep
                courses={activeCourses}
                selected={selected}
                onChange={setSelected}
                tenantName={name.trim()}
                tenantCode={tenant.code}
                isNew={isNew}
                removedCount={removedCount}
              />
            )}
          </>
        )}

        {step === 3 && (
          <ReviewStep
            mode="edit"
            summary={{ name: name.trim(), code: tenant.code, industry, country, users: userLimit || (tenant.userLimit >= UNLIMITED ? 'Unlimited' : String(tenant.userLimit)), status: tenantStatus === 'Suspended' && tenantStatus !== initialStatus ? `Suspended (${statusReason})` : tenantStatus }}
            organization={[
              ['Organization name', name],
              ['Tenant code', tenant.code, { mono: true }],
              ['User limit', userLimit ? `${userLimit} users` : tenant.userLimit >= UNLIMITED ? 'Unlimited' : `${tenant.userLimit} users`],
              ['Industry', industry],
              ['Country', country],
              ['Address', address],
            ]}
            billing={[
              ['Name', billingContactName],
              ['Email', billingEmail],
              ['Phone', displayPhone(phone)],
            ]}
            admin={[
              ['Name', lmsAdminName],
              ['Email', lmsAdminEmail],
              ['Role', 'Tenant LMS admin'],
              ['Tenant URL', lmsUrl || 'https://[tenant-url]', { mono: true }],
            ]}
            courses={selectedCourses}
            isNew={isNew}
            removed={courses.filter((c) => originalIds.has(c.id) && !selected.includes(c.id))}
            emptyCoursesNote="No courses selected."
          />
        )}

        <div className="tc-bottom">
          <Button type={step === 1 ? 'text' : 'default'} onClick={step === 1 ? onClose : () => setStep((s) => s - 1)} disabled={saving}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            type="primary"
            className={`tc-next${step === 1 && !requiredFilled ? ' is-pale' : ''}`}
            loading={saving}
            onClick={() => (step < 3 ? next() : void save())}
            style={step === 1 && !requiredFilled ? undefined : { background: 'linear-gradient(90deg, #683599 0%, #8246ab 100%)', border: 'none' }}
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
