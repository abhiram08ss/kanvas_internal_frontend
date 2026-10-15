import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Form, Input, Select, Button } from 'antd'
import './CreateTenant.css'
import './CreateTenantPage.css'
import { WizardSteps } from '../components/tenants/WizardSteps'
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Building2,
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Mail,
  RefreshCw,
  Receipt,
  UserCog,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { COUNTRIES } from '../data/countries'
import { ReviewStep } from '../components/tenants/ReviewStep'
import { CourseSelectStep } from '../components/tenants/CourseSelectStep'
import { TenantStatusCard, suspendReasonText, type TenantStatusChoice } from '../components/tenants/TenantStatusCard'
import { scrollToFirstError } from '../components/ui/scrollToError'
import { TENANT_CODE_MAX, validateTenantCode } from '../utils/validation'
import { useData, useDataNeeds } from '../context/DataContext'
import { api, errorMessage, type Credentials, type ProvisioningRecord } from '../api'

const KANVAS_GRADIENT = 'linear-gradient(135deg, #5c2d91, #7b3fa0)'

const formSteps = ['Organization', 'Select courses', 'Review & proceed']
const LIMIT_PRESETS = [50, 100, 250, 500]
const STEP_SUBTITLES = [
  'Set up the organization, who gets billed, and who manages their LMS.',
  "Pick the published courses this tenant's learners will get. You can add more later.",
  'Check everything below, then create the tenant.',
]

type Phase = 'form' | 'provisioning' | 'credentials'

const industries = ['IT Services', 'Manufacturing', 'Healthcare', 'Education', 'Retail', 'Finance', 'Other']

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
  | 'address'
  | 'statusReason'
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
  const [tenantStatus, setTenantStatus] = useState<TenantStatusChoice>('Active')
  const [statusReason, setStatusReason] = useState('')
  const [statusNote, setStatusNote] = useState('')
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

    const codeProblem = validateTenantCode(tenantCode)
    if (codeProblem) e.tenantCode = codeProblem

    if (!userLimit.trim()) e.userLimit = 'User limit is required.'
    else if (!Number.isInteger(limit) || limit < 1) e.userLimit = 'Enter a whole number of 1 or more.'
    else if (limit > 1000000) e.userLimit = 'User limit is too large.'

    if (!address.trim()) e.address = 'Address is required.'
    else if (address.trim().length < 5) e.address = 'Enter the full address (at least 5 characters).'

    if (!billingContactName.trim()) e.billingContactName = 'Billing name is required.'
    else if (!NAME_RE.test(billingContactName.trim())) e.billingContactName = 'Name can only contain letters, spaces, . - and \'.'

    if (!billingEmail.trim()) e.billingEmail = 'Billing email is required.'
    else if (!EMAIL_RE.test(billingEmail.trim())) e.billingEmail = 'Enter a valid email address.'

    if (!billingPhone.trim()) e.billingPhone = 'Contact number is required.'
    else if (!PHONE_RE.test(billingPhone.trim())) e.billingPhone = 'Contact number must be exactly 10 digits.'

    if (!lmsAdminName.trim()) e.lmsAdminName = 'Admin name is required.'
    else if (!NAME_RE.test(lmsAdminName.trim())) e.lmsAdminName = 'Name can only contain letters, spaces, . - and \'.'

    if (!lmsAdminEmail.trim()) e.lmsAdminEmail = 'Admin email is required.'
    else if (!EMAIL_RE.test(lmsAdminEmail.trim())) e.lmsAdminEmail = 'Enter a valid email address.'
    if (tenantStatus === 'Suspended' && !statusReason) e.statusReason = 'Select a reason for suspending this tenant.'
    return e
  }

  // Step 2 — course selection
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([])

  // Result state, once the tenant is actually created
  const [provisioning, setProvisioning] = useState<ProvisioningRecord | null>(null)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [busy, setBusy] = useState(false)
  const [flowError, setFlowError] = useState('')
  const [copied, setCopied] = useState(false)
  const [ticked, setTicked] = useState(0)

  const selectedCourses = courses.filter((c) => selectedCourseIds.includes(c.id))
  const provSteps = provisioning?.steps ?? []

  const goNext = async () => {
    if (step === 1) {
      const errs = validateOrg()
      setFieldErrors(errs)
      if (Object.keys(errs).length > 0) {
        setOrgError('Please fix the highlighted fields.')
        scrollToFirstError(document.querySelector('.tc-page'))
        return
      }
      setBusy(true)
      try {
        const { available } = await api.checkTenantCode(tenantCode)
        if (!available) {
          setFieldErrors((prev) => ({ ...prev, tenantCode: `Tenant code "${tenantCode}" is already in use - choose another.` }))
          setOrgError('Please fix the highlighted fields.')
          scrollToFirstError(document.querySelector('.tc-page'))
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
      if (tenantStatus === 'Suspended') {
        try {
          await api.setTenantStatus(created.tenant.id, 'Suspended', suspendReasonText(statusReason, statusNote))
        } catch (e) {
          notification.warning({ title: 'Tenant Created, But Not Suspended', description: errorMessage(e) })
        }
      }
      setProvisioning(created.provisioning)
      setCredentials(created.credentials)
      setPhase('provisioning')
      notification.success({ title: 'Tenant Created', description: `${orgName.trim()} was created successfully.` })
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
                size="middle"
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
                <Button size="middle" className="flex-grow-1" icon={<Copy size={15} />} onClick={() => void copyCredentials()}>
                  {copied ? 'Copied!' : 'Copy Details'}
                </Button>
                <Button type="primary" size="middle" className="flex-grow-1" onClick={() => navigate('/tenants')}>
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

  const requiredFilled = !!(orgName.trim() && tenantCode && userLimit.trim() && address.trim() && billingContactName.trim() && billingEmail.trim() && billingPhone.trim() && lmsAdminName.trim() && lmsAdminEmail.trim())
  const nextLabel = step === 1 ? 'Next: Select courses' : step === 2 ? 'Next: Review' : 'Create tenant'
  const limitNumber = Number(userLimit)
  const initial = orgName.trim()[0]?.toUpperCase()
  const hintStyle = { margin: 0 }

  return (
    <AppLayout title="Create tenant" subtitle={`Step ${step} of 3`} crumbs={[{ label: 'Tenants', to: '/tenants' }, { label: 'Create tenant' }]}>
      <div className="tc-page">
        <div className="tc-title-row">
          <button type="button" className="tc-back" onClick={() => navigate('/tenants')}>
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
              <h2 className="font-display tc-title">Create new tenant</h2>
              <p className="tc-sub">{STEP_SUBTITLES[step - 1]}</p>
            </div>
            <span className="tc-required">
              <b>*</b> Required fields
            </span>
          </div>
        </div>

        <div className="tc-stepper">
          <WizardSteps variant="dots" steps={formSteps} current={step} onStepClick={(n) => n < step && !busy && setStep(n)} captions={['Profile, billing & admin', 'Choose the course catalog', 'Confirm and provision']} />
        </div>

        {step === 1 && (
          <Form layout="vertical" noValidate>
            <div className="tc-grid">
              <div className="tc-main">
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
                    <Form.Item label="Organization Name" required validateStatus={fieldErrors.orgName ? 'error' : ''} help={fieldErrors.orgName}>
                      <Input
                        size="middle"
                        value={orgName}
                        maxLength={200}
                        onChange={(e) => {
                          setOrgName(e.target.value)
                          clearField('orgName')
                        }}
                        placeholder="Enter organization name"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Tenant Code"
                      required
                      validateStatus={fieldErrors.tenantCode ? 'error' : ''}
                      help={fieldErrors.tenantCode ?? <span className="tc-hint" style={hintStyle}>A–Z, 0–9 and hyphens only</span>}
                    >
                      <Input
                        size="middle"
                        className="tc-mono"
                        value={tenantCode}
                        maxLength={TENANT_CODE_MAX}
                        onChange={(e) => {
                          // Capitals are applied as you type; anything else that isn't allowed is flagged straight away.
                          const v = e.target.value.toUpperCase()
                          setTenantCode(v)
                          setFieldErrors((prev) => ({ ...prev, tenantCode: v ? (validateTenantCode(v.replace(/-$/, '')) ?? undefined) : undefined }))
                          setOrgError('')
                        }}
                        placeholder="e.g. ACME-01"
                      />
                    </Form.Item>
                    <Form.Item label="Industry">
                      <Select size="middle" value={industry} onChange={setIndustry} options={industries.map((i) => ({ value: i, label: i }))} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item label="Country" validateStatus={fieldErrors.country ? 'error' : ''} help={fieldErrors.country}>
                      <Select
                        size="middle"
                        showSearch
                        value={country || undefined}
                        onChange={(v) => {
                          setCountry(v)
                          clearField('country')
                        }}
                        options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                        placeholder="Select country"
                        optionFilterProp="label"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    <div className="tc-span2">
                      <Form.Item
                        label="User Limit"
                        required
                        validateStatus={fieldErrors.userLimit ? 'error' : ''}
                        help={fieldErrors.userLimit ?? <span className="tc-hint" style={hintStyle}>Learners who can sign in at the same time. You can raise it later.</span>}
                      >
                        <div className="tc-limit">
                          {LIMIT_PRESETS.map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`tc-limit-pick${userLimit === String(n) ? ' is-active' : ''}`}
                              onClick={() => {
                                setUserLimit(String(n))
                                clearField('userLimit')
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
                            onChange={(e) => {
                              setUserLimit(e.target.value)
                              clearField('userLimit')
                            }}
                            style={{ width: 120 }}
                            status={fieldErrors.userLimit ? 'error' : undefined}
                          />
                          <span className="tc-limit-unit">users</span>
                        </div>
                      </Form.Item>
                    </div>
                    <div className="tc-span2">
                      <Form.Item label="Address" required validateStatus={fieldErrors.address ? 'error' : ''} help={fieldErrors.address}>
                        <Input.TextArea
                          rows={2}
                          maxLength={300}
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value)
                            clearField('address')
                          }}
                          placeholder="Enter the full address: street, city, state and PIN code"
                        />
                      </Form.Item>
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
                      <Form.Item
                        label="Billing Name"
                        required
                        validateStatus={fieldErrors.billingContactName ? 'error' : ''}
                        help={fieldErrors.billingContactName}
                      >
                        <Input
                          size="middle"
                          value={billingContactName}
                          maxLength={120}
                          onChange={(e) => {
                            setBillingContactName(e.target.value)
                            clearField('billingContactName')
                          }}
                          placeholder="Enter billing contact name"
                        />
                      </Form.Item>
                      <Form.Item label="Billing Email" required validateStatus={fieldErrors.billingEmail ? 'error' : ''} help={fieldErrors.billingEmail}>
                        <Input
                          size="middle"
                          type="email"
                          value={billingEmail}
                          onChange={(e) => {
                            setBillingEmail(e.target.value)
                            clearField('billingEmail')
                          }}
                          placeholder="Enter billing email address"
                        />
                      </Form.Item>
                      <Form.Item
                        label="Contact Number"
                        required
                        validateStatus={fieldErrors.billingPhone ? 'error' : ''}
                        help={fieldErrors.billingPhone}
                      >
                        <Input
                          size="middle"
                          addonBefore="+91"
                          inputMode="tel"
                          value={billingPhone}
                          maxLength={10}
                          onChange={(e) => {
                            setBillingPhone(e.target.value.replace(/\D/g, ''))
                            clearField('billingPhone')
                          }}
                          placeholder="Enter 10-digit mobile number"
                        />
                      </Form.Item>
                    </div>
                  </section>

                  <section className="tc-card">
                    <div className="tc-card-head">
                      <span className="tc-card-icon">
                        <UserCog size={20} />
                      </span>
                      <div>
                        <h3 className="tc-card-title">LMS Administrator</h3>
                        <p className="tc-card-desc">The person who will manage courses and users for this tenant.</p>
                      </div>
                    </div>
                    <div className="tc-fields">
                      <Form.Item label="Admin Name" required validateStatus={fieldErrors.lmsAdminName ? 'error' : ''} help={fieldErrors.lmsAdminName}>
                        <Input
                          size="middle"
                          value={lmsAdminName}
                          maxLength={120}
                          onChange={(e) => {
                            setLmsAdminName(e.target.value)
                            clearField('lmsAdminName')
                          }}
                          placeholder="Enter admin name"
                        />
                      </Form.Item>
                      <Form.Item label="Admin Email" required validateStatus={fieldErrors.lmsAdminEmail ? 'error' : ''} help={fieldErrors.lmsAdminEmail}>
                        <Input
                          size="middle"
                          type="email"
                          value={lmsAdminEmail}
                          onChange={(e) => {
                            setLmsAdminEmail(e.target.value)
                            clearField('lmsAdminEmail')
                          }}
                          placeholder="Enter admin email address"
                        />
                      </Form.Item>
                      <div>
                        <Form.Item label="Tenant URL">
                          <div className="tc-url" title="Generated when the tenant is created">
                            <Globe size={15} />
                            <span>https://[tenant-url]</span>
                            <Copy size={14} style={{ opacity: 0.5 }} />
                          </div>
                        </Form.Item>
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
                      <div className={`tc-preview-name${orgName.trim() ? '' : ' is-empty'}`}>{orgName.trim() || 'Organization name'}</div>
                      <span className="tc-preview-code">{tenantCode ? tenantCode.toUpperCase() : 'TENANT-CODE'}</span>
                    </div>
                  </div>
                  <div className="tc-preview-row">
                    <span>User Limit</span>
                    <span>{Number.isFinite(limitNumber) && limitNumber > 0 ? `${limitNumber.toLocaleString()} users` : 'Not set'}</span>
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
                    clearField('statusReason')
                  }}
                  reason={statusReason}
                  onReasonChange={(r) => {
                    setStatusReason(r)
                    clearField('statusReason')
                  }}
                  note={statusNote}
                  onNoteChange={setStatusNote}
                  reasonError={fieldErrors.statusReason}
                />
              </aside>
            </div>
          </Form>
        )}

        {step === 2 && (
          <CourseSelectStep
            courses={courses.filter((c) => c.status === 'Active')}
            selected={selectedCourseIds}
            onChange={setSelectedCourseIds}
            tenantName={orgName.trim()}
            tenantCode={tenantCode}
          />
        )}

        {step === 3 && (
          <ReviewStep
            mode="create"
            summary={{ name: orgName.trim(), code: tenantCode, industry, country, users: userLimit, status: tenantStatus === 'Suspended' ? `Suspended (${statusReason})` : 'Active' }}
            organization={[
              ['Organization name', orgName],
              ['Tenant code', tenantCode, { mono: true }],
              ['User limit', userLimit ? `${userLimit} users` : ''],
              ['Industry', industry],
              ['Country', country],
              ['Address', address],
            ]}
            billing={[
              ['Name', billingContactName],
              ['Email', billingEmail],
              ['Phone', billingPhone ? `+91 ${billingPhone}` : ''],
            ]}
            admin={[
              ['Name', lmsAdminName],
              ['Email', lmsAdminEmail],
              ['Role', 'Tenant LMS admin'],
              ['Tenant URL', 'https://[tenant-url]', { mono: true }],
            ]}
            courses={selectedCourses}
            emptyCoursesNote="No courses selected - you can assign courses later from the Tenants page."
            error={flowError}
          />
        )}

        <div className="tc-bottom">
          {step === 1 ? (
            <Button type="text" onClick={goBack} disabled={busy}>
              Cancel
            </Button>
          ) : (
            <Button onClick={goBack} disabled={busy}>
              Back
            </Button>
          )}
          {step === 1 && orgError && <span className="tc-bottom-msg">{orgError}</span>}
          <Button
            type="primary"
            className={`tc-next${step === 1 && !requiredFilled ? ' is-pale' : ''}`}
            loading={busy}
            onClick={() => (step < 3 ? void goNext() : void createTenant())}
            style={step === 1 && !requiredFilled ? undefined : { background: KANVAS_GRADIENT, border: 'none' }}
          >
            {nextLabel} {step < 3 && <ArrowRight size={15} />}
          </Button>
        </div>
      </div>
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
