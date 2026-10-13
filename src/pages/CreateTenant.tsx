import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Form, Input, Select, Button, Empty } from 'antd'
import './CreateTenant.css'
import { WizardSteps, WizardTitleRow, FormSection } from '../components/tenants/WizardSteps'
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Search,
  ShieldCheck,
  BookOpen,
  Mail,
  RefreshCw,
  Receipt,
  UserCog,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { COUNTRIES } from '../data/countries'
import { ReviewCard, ReviewRow } from '../components/tenants/ReviewParts'
import { CourseGroupPicker, ReviewCourseGroups } from '../components/tenants/CourseGroupPicker'
import { useData, useDataNeeds } from '../context/DataContext'
import { api, errorMessage, type Credentials, type ProvisioningRecord } from '../api'

const KANVAS_GRADIENT = 'linear-gradient(135deg, #5c2d91, #7b3fa0)'

const formSteps = ['Organization', 'Select Courses', 'Review & Proceed']

type Phase = 'form' | 'provisioning' | 'credentials'

const industries = ['IT Services', 'Manufacturing', 'Healthcare', 'Education', 'Retail', 'Finance', 'Other']

// Tenant codes are lowercase letters/digits only (the backend enforces the same rule).
const normalizeCode = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40)

const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/
const PHONE_RE = /^[0-9]{10}$/

type OrgField =
  | 'orgName'
  | 'tenantCode'
  | 'userLimit'
  | 'country'
  | 'billingContactName'
  | 'billingEmail'
  | 'billingPhone'
  | 'lmsAdminName'
  | 'lmsAdminEmail'
type OrgErrors = Partial<Record<OrgField, string>>

export default function CreateTenant() {
  const navigate = useNavigate()
  const { notification } = App.useApp()
  const { courses, refresh } = useData()
  useDataNeeds('courses', 'courseOptions')

  const [step, setStep] = useState(1)
  const [phase, setPhase] = useState<Phase>('form')

  // Step 1 — Organization / Billing / LMS Admin
  const [orgName, setOrgName] = useState('')
  const [tenantCode, setTenantCode] = useState('')
  const [industry, setIndustry] = useState(industries[0])
  const [country, setCountry] = useState('India')
  const [address, setAddress] = useState('')
  const [userLimit, setUserLimit] = useState('100')
  const [billingContactName, setBillingContactName] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [billingPhone, setBillingPhone] = useState('')
  const [lmsAdminName, setLmsAdminName] = useState('')
  const [lmsAdminEmail, setLmsAdminEmail] = useState('')
  const [orgError, setOrgError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<OrgErrors>({})
  // Clears one field's error as soon as the user edits it.
  const clearField = (key: OrgField) => {
    setOrgError('')
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }
  const validateOrg = (): OrgErrors => {
    const e: OrgErrors = {}
    const limit = Number(userLimit)
    if (!orgName.trim()) e.orgName = 'Organization name is required.'
    else if (orgName.trim().length < 2) e.orgName = 'Organization name must be at least 2 characters.'
    else if (orgName.trim().length > 200) e.orgName = 'Organization name must be 200 characters or fewer.'

    if (!tenantCode) e.tenantCode = 'Tenant code is required.'
    else if (tenantCode.length < 2) e.tenantCode = 'Tenant code must be at least 2 letters or digits.'

    if (!userLimit.trim()) e.userLimit = 'User limit is required.'
    else if (!Number.isInteger(limit) || limit < 1) e.userLimit = 'Enter a whole number of 1 or more.'
    else if (limit > 1000000) e.userLimit = 'User limit is too large.'

    if (billingContactName.trim() && !NAME_RE.test(billingContactName.trim())) e.billingContactName = 'Name can only contain letters, spaces, . - and \'.'

    if (!billingEmail.trim()) e.billingEmail = 'Billing email is required.'
    else if (!EMAIL_RE.test(billingEmail.trim())) e.billingEmail = 'Enter a valid email address.'

    if (billingPhone.trim() && !PHONE_RE.test(billingPhone.trim())) e.billingPhone = 'Phone number must be exactly 10 digits.'

    if (!lmsAdminName.trim()) e.lmsAdminName = 'Admin name is required.'
    else if (!NAME_RE.test(lmsAdminName.trim())) e.lmsAdminName = 'Name can only contain letters, spaces, . - and \'.'

    if (!lmsAdminEmail.trim()) e.lmsAdminEmail = 'Admin email is required.'
    else if (!EMAIL_RE.test(lmsAdminEmail.trim())) e.lmsAdminEmail = 'Enter a valid email address.'
    return e
  }

  // Step 2 — course selection
  const [courseQuery, setCourseQuery] = useState('')
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([])

  // Result state, once the tenant is actually created
  const [provisioning, setProvisioning] = useState<ProvisioningRecord | null>(null)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [busy, setBusy] = useState(false)
  const [flowError, setFlowError] = useState('')
  const [copied, setCopied] = useState(false)
  const [ticked, setTicked] = useState(0)

  const [courseCategory, setCourseCategory] = useState('All')
  const categoryTypes = Array.from(new Set(courses.filter((c) => c.status === 'Active').map((c) => c.category)))
  const visibleCourses = courses.filter(
    (c) =>
      c.status === 'Active' &&
      (courseCategory === 'All' || c.category === courseCategory) &&
      (c.name.toLowerCase().includes(courseQuery.toLowerCase()) || c.code.toLowerCase().includes(courseQuery.toLowerCase())),
  )
  const selectAllVisible = () => setSelectedCourseIds((prev) => Array.from(new Set([...prev, ...visibleCourses.map((c) => c.id)])))
  const selectedCourses = courses.filter((c) => selectedCourseIds.includes(c.id))
  const provSteps = provisioning?.steps ?? []

  const goNext = async () => {
    if (step === 1) {
      const errs = validateOrg()
      setFieldErrors(errs)
      if (Object.keys(errs).length > 0) {
        setOrgError('Please fix the highlighted fields.')
        return
      }
      setBusy(true)
      try {
        const { available } = await api.checkTenantCode(tenantCode)
        if (!available) {
          setFieldErrors((prev) => ({ ...prev, tenantCode: `Tenant code "${tenantCode}" is already in use - choose another.` }))
          setOrgError('Please fix the highlighted fields.')
          return
        }
      } catch (e) {
        setOrgError(errorMessage(e))
        return
      } finally {
        setBusy(false)
      }
      setOrgError('')
    }
    setStep((s) => Math.min(3, s + 1))
  }

  const goBack = () => {
    if (step === 1) {
      navigate('/tenants')
      return
    }
    setStep((s) => Math.max(1, s - 1))
  }

  const toggleCourse = (id: number) => {
    setSelectedCourseIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true)
    setFlowError('')
    try {
      await fn()
    } catch (e) {
      setFlowError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const createTenant = () =>
    attempt(async () => {
      const created = await api.createTenant({
        name: orgName.trim(),
        code: tenantCode,
        industry,
        country,
        address,
        billingContactName,
        billingEmail: billingEmail.trim(),
        billingPhone,
        lmsAdminName: lmsAdminName.trim(),
        lmsAdminEmail: lmsAdminEmail.trim(),
        userLimit: Number(userLimit),
        courseIds: selectedCourseIds,
      })
      setProvisioning(created.provisioning)
      setCredentials(created.credentials)
      setPhase('provisioning')
      notification.success({ title: 'Tenant created', description: `${orgName.trim()} was created successfully.` })
      void refresh()
    })

  const retryProvisioning = () =>
    attempt(async () => {
      if (!provisioning) return
      const retried = await api.retryProvisioning(provisioning.id)
      setProvisioning(retried)
      if (retried.credentials) setCredentials(retried.credentials)
      void refresh()
    })

  // animate the (real) provisioning checklist
  useEffect(() => {
    if (phase !== 'provisioning') {
      setTicked(0)
      return
    }
    if (ticked >= provSteps.length) return
    const t = setTimeout(() => setTicked((n) => n + 1), 350)
    return () => clearTimeout(t)
  }, [phase, ticked, provSteps.length])

  const animationDone = provSteps.length > 0 && ticked >= provSteps.length
  const provisioningOk = animationDone && provisioning?.status === 'Success'
  const provisioningFailed = animationDone && provisioning?.status === 'Failed'

  const copyCredentials = async () => {
    if (!credentials) return
    const text = `LMS URL: ${credentials.lmsUrl}\nUsername: ${credentials.username}\nTemporary Password: ${credentials.temporaryPassword}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  // ---- Post-creation phases ----
  if (phase !== 'form') {
    return (
      <AppLayout title="Create Tenant" subtitle="Provisioning">
        <div className="mx-auto" style={{ maxWidth: 512 }}>
          {phase === 'provisioning' && (
            <Card className="p-4">
              <div className="mb-3 d-flex flex-column align-items-center gap-3 text-center">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success"
                  style={{ width: 56, height: 56 }}
                >
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h3 className="font-display fs-5 fw-bold text-dark mb-0">{orgName}</h3>
                  <p className="small text-secondary mb-0">Setting up the tenant in the existing LMS…</p>
                </div>
              </div>

              <div className="d-flex flex-column gap-2">
                {provSteps.map((s, i) => {
                  const shown = i < ticked
                  const failed = shown && s.status === 'Failed'
                  const done = shown && s.status === 'Done'
                  return (
                    <div key={s.name} className="d-flex align-items-center gap-3">
                      <div
                        className={`d-flex flex-shrink-0 align-items-center justify-content-center rounded-circle ${
                          failed ? 'bg-danger text-white' : done ? 'bg-success text-white' : 'bg-secondary-subtle text-secondary'
                        }`}
                        style={{ width: 20, height: 20 }}
                      >
                        {failed ? <XCircle size={12} /> : done ? <Check size={12} /> : <Loader2 size={11} className={shown ? '' : 'spin'} />}
                      </div>
                      <span className={`small ${failed ? 'text-danger' : done ? 'text-dark' : 'text-secondary'}`}>{s.name}</span>
                    </div>
                  )
                })}
              </div>

              {provisioningFailed && (
                <div className="mt-3 rounded-2 bg-danger-subtle p-3 small text-danger-emphasis">
                  <p className="fw-semibold mb-0">Provisioning did not complete</p>
                  <p className="mt-1 mb-0" style={{ fontSize: 12 }}>
                    {provisioning?.error ?? 'An LMS step failed.'} The tenant is saved; retry to continue.
                  </p>
                  <Button
                    type="link"
                    danger
                    size="small"
                    loading={busy}
                    icon={<RefreshCw size={12} />}
                    onClick={() => void retryProvisioning()}
                    className="mt-2 p-0"
                  >
                    Retry provisioning
                  </Button>
                </div>
              )}
              {flowError && !provisioningFailed && <p className="mt-3 small text-danger mb-0">{flowError}</p>}

              <Button
                type="primary"
                block
                size="large"
                className="mt-4"
                disabled={!provisioningOk}
                onClick={() => {
                  setFlowError('')
                  setPhase('credentials')
                }}
              >
                View Tenant Details
              </Button>
            </Card>
          )}

          {phase === 'credentials' && credentials && (
            <Card className="p-4">
              <div className="mb-4 d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-2 bg-primary-subtle text-primary flex-shrink-0"
                  style={{ width: 44, height: 44 }}
                >
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-display fs-5 fw-bold text-dark mb-0">Welcome to Kanvas LMS</h3>
                  <p className="small text-secondary mb-0">
                    Hi {lmsAdminName || 'there'}, {orgName} is now active.
                  </p>
                </div>
              </div>
              <div className="d-flex flex-column gap-2 rounded-2 bg-light p-3 small">
                <Row label="LMS URL" value={credentials.lmsUrl} mono />
                <Row label="Username" value={credentials.username} mono />
                <Row label="Temporary Password" value={credentials.temporaryPassword} mono />
              </div>
              <p className="mt-3 text-secondary mb-0" style={{ fontSize: 12 }}>
                Credentials are sent to the tenant admin email. This temporary password is shown only once — copy it now (you can issue a new one later from
                Provisioning).
              </p>
              <div className="mt-4 d-flex gap-3">
                <Button size="large" className="flex-grow-1" icon={<Copy size={15} />} onClick={() => void copyCredentials()}>
                  {copied ? 'Copied!' : 'Copy Details'}
                </Button>
                <Button type="primary" size="large" className="flex-grow-1" onClick={() => navigate('/tenants')}>
                  Done
                </Button>
              </div>
            </Card>
          )}
        </div>
      </AppLayout>
    )
  }

  // ---- 3-step form (antd) ----

  const primaryBtnStyle = { background: KANVAS_GRADIENT, border: 'none' }
  const cancelBtnStyle = { background: '#f5f4f8', color: '#7b6b94', border: '1.5px solid #ede8f5' }

  return (
    <AppLayout title="Create Tenant" subtitle={`Step ${step} of 3`}>
      <>
        <Button type="text" className="mb-3" icon={<ArrowLeft size={16} />} onClick={() => navigate('/tenants')} style={{ color: '#7b6b94', fontWeight: 600 }}>
          Back to Tenants
        </Button>

        <WizardTitleRow title="Create New Tenant" />
        <div className="wz-stepper-card">
          <WizardSteps steps={formSteps} current={step} />
        </div>

        <Card className="p-0 ct-wizard-card">
          <div className={step === 1 ? '' : 'p-4'}>
            {step === 1 && (
              <Form layout="vertical" noValidate>
                <FormSection icon={<Building2 size={22} />} title="Organization Information" description="Organization profile and tenant settings.">
                  <div className="row">
                    <div className="col-12 col-md-6">
                      <Form.Item label="Organization Name" required validateStatus={fieldErrors.orgName ? 'error' : ''} help={fieldErrors.orgName}>
                        <Input
                          size="middle"
                          value={orgName}
                          maxLength={200}
                          onChange={(e) => { setOrgName(e.target.value); clearField('orgName') }}
                          placeholder="Enter organization name"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-12 col-md-6">
                      <Form.Item
                        label="Tenant Code"
                        required
                        validateStatus={fieldErrors.tenantCode ? 'error' : ''}
                        help={fieldErrors.tenantCode}
                        tooltip="Lowercase letters and digits only."
                      >
                        <Input
                          size="middle"
                          value={tenantCode}
                          onChange={(e) => { setTenantCode(normalizeCode(e.target.value)); clearField('tenantCode') }}
                          placeholder="Enter tenant code"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-12 col-md-4">
                      <Form.Item label="Industry">
                        <Select size="middle" value={industry} onChange={setIndustry} options={industries.map((i) => ({ value: i, label: i }))} style={{ width: '100%' }} />
                      </Form.Item>
                    </div>
                    <div className="col-12 col-md-4">
                      <Form.Item label="User Limit" required validateStatus={fieldErrors.userLimit ? 'error' : ''} help={fieldErrors.userLimit}>
                        <Input
                          size="middle"
                          type="number"
                          min={1}
                          value={userLimit}
                          onChange={(e) => { setUserLimit(e.target.value); clearField('userLimit') }}
                          placeholder="Enter user limit"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-12 col-md-4">
                      <Form.Item label="Country" validateStatus={fieldErrors.country ? 'error' : ''} help={fieldErrors.country}>
                        <Select
                          size="middle"
                          showSearch
                          value={country || undefined}
                          onChange={(v) => { setCountry(v); clearField('country') }}
                          options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                          placeholder="Select country"
                          optionFilterProp="label"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </div>
                    <div className="col-12">
                      <Form.Item label="Address">
                        <Input.TextArea rows={3} maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter full address" />
                      </Form.Item>
                    </div>
                  </div>
                </FormSection>

                <FormSection icon={<Receipt size={22} />} title="Billing Contact Details" description="Contact information for billing.">
                  <div className="row">
                    <div className="col-12 col-md-4">
                      <Form.Item label="Billing Contact Name" validateStatus={fieldErrors.billingContactName ? 'error' : ''} help={fieldErrors.billingContactName}>
                        <Input
                          size="middle"
                          value={billingContactName}
                          maxLength={120}
                          onChange={(e) => { setBillingContactName(e.target.value); clearField('billingContactName') }}
                          placeholder="Enter contact name"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-12 col-md-4">
                      <Form.Item label="Billing Email" required validateStatus={fieldErrors.billingEmail ? 'error' : ''} help={fieldErrors.billingEmail}>
                        <Input
                          size="middle"
                          type="email"
                          value={billingEmail}
                          onChange={(e) => { setBillingEmail(e.target.value); clearField('billingEmail') }}
                          placeholder="Enter billing email"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-12 col-md-4">
                      <Form.Item label="Phone" validateStatus={fieldErrors.billingPhone ? 'error' : ''} help={fieldErrors.billingPhone}>
                        <Input
                          size="middle"
                          inputMode="tel"
                          value={billingPhone}
                          maxLength={10}
                          onChange={(e) => { setBillingPhone(e.target.value.replace(/\D/g, '')); clearField('billingPhone') }}
                          placeholder="Enter 10-digit phone number"
                        />
                      </Form.Item>
                    </div>
                  </div>
                </FormSection>

                <FormSection icon={<UserCog size={22} />} title="LMS Admin Details" description="Primary administrator for the tenant's LMS.">
                  <div className="row">
                    <div className="col-12 col-md-6">
                      <Form.Item label="Admin Name" required validateStatus={fieldErrors.lmsAdminName ? 'error' : ''} help={fieldErrors.lmsAdminName}>
                        <Input
                          size="middle"
                          value={lmsAdminName}
                          maxLength={120}
                          onChange={(e) => { setLmsAdminName(e.target.value); clearField('lmsAdminName') }}
                          placeholder="Enter admin name"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-12 col-md-6">
                      <Form.Item label="Admin Email" required validateStatus={fieldErrors.lmsAdminEmail ? 'error' : ''} help={fieldErrors.lmsAdminEmail}>
                        <Input
                          size="middle"
                          type="email"
                          value={lmsAdminEmail}
                          onChange={(e) => { setLmsAdminEmail(e.target.value); clearField('lmsAdminEmail') }}
                          placeholder="Enter admin email"
                        />
                      </Form.Item>
                    </div>
                  </div>
                  {orgError && <p className="small text-danger mt-3 mb-0">{orgError}</p>}
                </FormSection>
              </Form>
            )}

            {step === 2 && (
              <div>
                <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
                  <div>
                    <h3 className="mb-1 font-display fs-5 fw-bold text-dark">Select Courses</h3>
                    <p className="mb-0 small text-secondary">Choose which published courses this tenant should have access to.</p>
                  </div>
                  <span className="ct-selected-pill">
                    <Check size={14} /> {selectedCourseIds.length} selected
                  </span>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                  <div style={{ width: 320, maxWidth: '100%' }}>
                    <Input
                      size="large"
                      allowClear
                      value={courseQuery}
                      onChange={(e) => setCourseQuery(e.target.value)}
                      placeholder="Search courses"
                      prefix={<Search size={14} color="#9b87b5" />}
                    />
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {['All', ...categoryTypes].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`ct-chip${courseCategory === cat ? ' is-active' : ''}`}
                        onClick={() => setCourseCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="ms-auto d-flex gap-2">
                    <Button onClick={selectAllVisible} disabled={visibleCourses.length === 0}>
                      Select all{courseCategory !== 'All' || courseQuery ? ' shown' : ''}
                    </Button>
                    <Button onClick={() => setSelectedCourseIds([])} disabled={selectedCourseIds.length === 0}>
                      Clear
                    </Button>
                  </div>
                </div>

                {visibleCourses.length === 0 ? (
                  <div className="py-5">
                    <Empty description="No courses match your filters." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                ) : (
                  <CourseGroupPicker courses={visibleCourses} selected={selectedCourseIds} onToggle={toggleCourse} />
                )}
              </div>
            )}

            {step === 3 && (
              <div className="mx-auto" style={{ maxWidth: 920 }}>
                <h3 className="mb-1 font-display fs-5 fw-bold text-dark">Review &amp; Proceed</h3>
                <p className="mb-4 small text-secondary">Check the details below. Click Create Tenant to provision it.</p>

                <div className="row g-3">
                  <div className="col-12 col-lg-6">
                    <ReviewCard icon={<Building2 size={18} />} title="Organization">
                      <ReviewRow label="Name" value={orgName} />
                      <ReviewRow label="Tenant code" value={tenantCode} mono />
                      <ReviewRow label="Industry" value={industry} />
                      <ReviewRow label="Country" value={country} />
                      <ReviewRow label="User limit" value={userLimit} />
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
                        <p className="small text-secondary mb-0">No courses selected - you can assign courses later from the Tenants page.</p>
                      ) : (
                        <ReviewCourseGroups courses={selectedCourses} />
                      )}
                    </ReviewCard>
                  </div>
                </div>

                {flowError && <p className="mt-3 small text-danger mb-0">{flowError}</p>}
              </div>
            )}
          </div>

          <div className="ct-wizard-footer d-flex justify-content-between">
            <Button onClick={goBack} disabled={busy} size="large" style={cancelBtnStyle}>
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            {step < 3 ? (
              <Button type="primary" onClick={() => void goNext()} loading={busy} size="large" style={primaryBtnStyle}>
                Next
              </Button>
            ) : (
              <Button type="primary" onClick={() => void createTenant()} loading={busy} size="large" style={primaryBtnStyle}>
                Create Tenant
              </Button>
            )}
          </div>
        </Card>
      </>
    </AppLayout>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="d-flex justify-content-between gap-3">
      <span className="text-secondary">{label}</span>
      <span className="text-end fw-medium text-dark" style={mono ? { fontFamily: 'monospace' } : undefined}>
        {value}
      </span>
    </div>
  )
}
