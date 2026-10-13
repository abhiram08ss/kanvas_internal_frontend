import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, BookOpen, Check, Mail, Search, ShieldCheck, Receipt, UserCog } from 'lucide-react'
import { App, Button, Empty, Input, Select, Spin } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/State'
import { ReviewCard, ReviewRow } from '../components/tenants/ReviewParts'
import { CourseGroupPicker, ReviewCourseGroups } from '../components/tenants/CourseGroupPicker'
import { COUNTRIES } from '../data/countries'
import { useData, useDataNeeds } from '../context/DataContext'
import { api, errorMessage, type Tenant, type TenantCourse } from '../api'
import './CreateTenant.css'
import { WizardSteps, WizardTitleRow, FormSection } from '../components/tenants/WizardSteps'

const INDUSTRIES = ['IT Services', 'Manufacturing', 'Healthcare', 'Education', 'Retail', 'Finance', 'Other']
const UNLIMITED = 999_999
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/
const PHONE_RE = /^[0-9]{10}$/
const STEP_LABELS = ['Organization', 'Select Courses', 'Review & Proceed']

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
  // Courses the tenant already has are shown ticked but disabled (they stay assigned); only courses that are
  // not yet assigned can be ticked, and ones added during this edit can be unticked again.
  const activeCourses = courses.filter((c) => c.status === 'Active' || selected.includes(c.id))
  const hiddenCount = originalIds.size
  const categoryTypes = Array.from(new Set(activeCourses.map((c) => c.category)))
  const visible = activeCourses.filter(
    (c) =>
      (category === 'All' || c.category === category) &&
      (c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase())),
  )
  const selectedCourses = courses.filter((c) => selected.includes(c.id))

  const toggle = (id: number) => {
    if (originalIds.has(id)) return // already assigned: shown disabled
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const selectAllVisible = () => setSelected((prev) => Array.from(new Set([...prev, ...visible.map((c) => c.id)])))
  // Clear only undoes what was added in this edit; the tenant's existing courses stay.
  const clearAll = () => setSelected((prev) => prev.filter((id) => originalIds.has(id)))

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
    <AppLayout title="Edit Tenant" subtitle={`${tenant.name} · ${tenant.code}`}>
      <div className="wz-page">
      <Button type="text" className="mb-3" icon={<ArrowLeft size={16} />} onClick={onClose} style={{ color: '#7b6b94', fontWeight: 600 }}>
        Back to Tenants
      </Button>
      <WizardTitleRow title="Edit Tenant" />
      <div className="wz-stepper-card">
        <WizardSteps steps={STEP_LABELS} current={step} />
      </div>

      <Card className="p-0 ct-wizard-card">
        <div className={step === 1 ? '' : 'p-4'}>
        {error && (
          <div className="mb-3">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        {step === 1 && (
          <div>
            <FormSection icon={<Building2 size={22} />} title="Organization Information" description="Organization profile and tenant settings.">
            <div className="row">
              <div className="col-12 col-md-4">
                <Field label="Organization Name" required error={errors.name}>
                  <Input size="middle" value={name} maxLength={200} status={status('name')} onChange={(e) => { setName(e.target.value); clear('name') }} placeholder="Enter organization name" />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Tenant Code" hint="Can't be changed after creation.">
                  <Input size="middle" value={tenant.code} disabled />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Industry">
                  <Select size="middle" value={industry} onChange={setIndustry} options={[...new Set([...INDUSTRIES, industry])].map((i) => ({ value: i, label: i }))} style={{ width: '100%' }} />
                </Field>
              </div>
              <div className="col-12 col-md-4">
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
              </div>
              <div className="col-12 col-md-4">
                <Field label="User Limit" error={errors.userLimit} hint={tenant.userLimit >= UNLIMITED ? 'Currently unlimited. Leave blank to keep it.' : `${tenant.users} users active now.`}>
                  <Input size="middle" type="number" min={1} value={userLimit} status={status('userLimit')} onChange={(e) => { setUserLimit(e.target.value); clear('userLimit') }} placeholder="Enter user limit" />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Address">
                  <Input size="middle" maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter full address" />
                </Field>
              </div>
            </div>
            </FormSection>

            <FormSection icon={<Receipt size={22} />} title="Billing Contact Details" description="Contact information for billing.">
            <div className="row">
              <div className="col-12 col-md-4">
                <Field label="Contact Name" error={errors.billingContactName}>
                  <Input size="middle" value={billingContactName} maxLength={120} status={status('billingContactName')} onChange={(e) => { setBillingContactName(e.target.value); clear('billingContactName') }} placeholder="Enter contact name" />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Billing Email" required error={errors.billingEmail}>
                  <Input size="middle" type="email" value={billingEmail} status={status('billingEmail')} onChange={(e) => { setBillingEmail(e.target.value); clear('billingEmail') }} placeholder="Enter billing email" />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Phone" error={errors.billingPhone}>
                  <Input size="middle" inputMode="tel" maxLength={10} value={billingPhone} status={status('billingPhone')} onChange={(e) => { setBillingPhone(e.target.value.replace(/\D/g, '')); clear('billingPhone') }} placeholder="Enter 10-digit phone number" />
                </Field>
              </div>
            </div>
            </FormSection>

            <FormSection icon={<UserCog size={22} />} title="LMS Admin Details" description="Primary administrator for the tenant's LMS.">
            <div className="row">
              <div className="col-12 col-md-4">
                <Field label="Admin Name" required error={errors.lmsAdminName}>
                  <Input size="middle" value={lmsAdminName} maxLength={120} status={status('lmsAdminName')} onChange={(e) => { setLmsAdminName(e.target.value); clear('lmsAdminName') }} placeholder="Enter admin name" />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Admin Email" required error={errors.lmsAdminEmail}>
                  <Input size="middle" type="email" value={lmsAdminEmail} status={status('lmsAdminEmail')} onChange={(e) => { setLmsAdminEmail(e.target.value); clear('lmsAdminEmail') }} placeholder="Enter admin email" />
                </Field>
              </div>
            </div>
            </FormSection>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
              <div>
                <h3 className="mb-1 font-display fs-5 fw-bold text-dark">Select Courses</h3>
                <p className="mb-0 small text-secondary">
                  Choose more published courses for this tenant.
                  {hiddenCount > 0 && ` The ${hiddenCount} course${hiddenCount === 1 ? '' : 's'} it already has ${hiddenCount === 1 ? 'is' : 'are'} ticked and can't be changed here.`}
                </p>
              </div>
              <span className="ct-selected-pill">
                <Check size={14} /> {selected.length} selected{newCount > 0 ? ` · ${newCount} new` : ''}
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
                  <CourseGroupPicker courses={visible} selected={selected} lockedIds={originalIds} isNew={isNew} onToggle={toggle} />
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
                    <ReviewCourseGroups courses={selectedCourses} isNew={isNew} />
                  )}
                </ReviewCard>
              </div>
            </div>
          </div>
        )}

        </div>
        <div className="ct-wizard-footer">{footer}</div>
      </Card>
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
