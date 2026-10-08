import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Steps, Form, Input, Select, Button, Checkbox, Descriptions, Empty } from 'antd'
import './CreateTenant.css'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Search,
  Users,
  ShieldCheck,
  BookOpen,
  LayoutGrid,
  FileText,
  BarChart3,
  HeartHandshake,
  LifeBuoy,
  Network,
  Bell,
  ExternalLink,
  Mail,
  RefreshCw,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { useData, useDataNeeds } from '../context/DataContext'
import { api, errorMessage, type Credentials, type ProvisioningRecord } from '../api'

const KANVAS_GRADIENT = 'linear-gradient(135deg, #5c2d91, #7b3fa0)'

const formSteps = ['Organization', 'Select Courses', 'Review & Proceed']

type Phase = 'form' | 'provisioning' | 'credentials' | 'active'

const tenantCapabilities = [
  { icon: Users, label: 'Manage Users' },
  { icon: ShieldCheck, label: 'Manage Roles' },
  { icon: BookOpen, label: 'Manage Courses' },
  { icon: LayoutGrid, label: 'Content & Quiz' },
  { icon: FileText, label: 'Learning & Enrollments' },
  { icon: BarChart3, label: 'Reports' },
  { icon: HeartHandshake, label: 'HR Policies' },
  { icon: LifeBuoy, label: 'Helpdesk' },
  { icon: Network, label: 'Org Chart' },
  { icon: Bell, label: 'Notifications' },
]

const industries = ['IT Services', 'Manufacturing', 'Healthcare', 'Education', 'Retail', 'Finance', 'Other']

// Tenant codes are lowercase letters/digits only (the backend enforces the same rule).
const normalizeCode = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40)

export default function CreateTenant() {
  const navigate = useNavigate()
  const { courses, refresh } = useData()
  useDataNeeds('courses')

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

  const availableCourses = courses.filter((c) => c.status === 'Active' && c.name.toLowerCase().includes(courseQuery.toLowerCase()))
  const selectedCourses = courses.filter((c) => selectedCourseIds.includes(c.id))
  const provSteps = provisioning?.steps ?? []

  const goNext = async () => {
    if (step === 1) {
      const limit = Number(userLimit)
      if (!orgName.trim() || !tenantCode.trim() || !billingEmail.trim() || !lmsAdminName.trim() || !lmsAdminEmail.trim()) {
        setOrgError('Organization Name, Tenant Code, Billing Email, and LMS Admin Name/Email are required.')
        return
      }
      if (tenantCode.length < 2) {
        setOrgError('Tenant Code must be at least 2 letters or digits.')
        return
      }
      if (!Number.isInteger(limit) || limit < 1) {
        setOrgError('User Limit must be a positive whole number.')
        return
      }
      setBusy(true)
      try {
        const { available } = await api.checkTenantCode(tenantCode)
        if (!available) {
          setOrgError(`Tenant Code "${tenantCode}" is already in use — choose another.`)
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
                <Button
                  type="primary"
                  size="large"
                  className="flex-grow-1"
                  iconPlacement="end"
                  icon={<ExternalLink size={15} />}
                  onClick={() => setPhase('active')}
                >
                  Open LMS
                </Button>
              </div>
            </Card>
          )}

          {phase === 'active' && (
            <Card className="p-4">
              <div className="mb-4 d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-2 bg-success-subtle text-success flex-shrink-0"
                  style={{ width: 44, height: 44 }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="font-display fs-5 fw-bold text-dark mb-0">Tenant Active in LMS</h3>
                  <p className="small text-secondary mb-0">
                    {credentials?.username} now manages {orgName} within the existing LMS.
                  </p>
                </div>
              </div>

              <div className="row row-cols-3 g-3">
                <div className="col">
                  <MiniStat label="User Limit" value={userLimit} />
                </div>
                <div className="col">
                  <MiniStat label="Courses Assigned" value={selectedCourses.length.toString()} />
                </div>
                <div className="col">
                  <MiniStat label="Active Users" value="0" />
                </div>
              </div>

              <p className="mb-2 mt-4 small fw-semibold text-dark">Recent Activity</p>
              <div className="d-flex flex-column gap-2 small text-secondary">
                <div className="d-flex justify-content-between">
                  <span>Tenant provisioned in existing LMS</span>
                  <span className="text-secondary">Just now</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Admin account created</span>
                  <span className="text-secondary">Just now</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>{selectedCourses.length} courses assigned</span>
                  <span className="text-secondary">Just now</span>
                </div>
              </div>

              <p className="mb-2 mt-4 small fw-semibold text-dark">Available Modules</p>
              <div className="row row-cols-2 row-cols-sm-3 g-3">
                {tenantCapabilities.map(({ icon: Icon, label }) => (
                  <div key={label} className="col">
                    <div className="d-flex align-items-center gap-2 rounded-2 border px-3 py-2 small text-dark h-100">
                      <Icon size={16} className="flex-shrink-0 text-primary" /> {label}
                    </div>
                  </div>
                ))}
              </div>

              <Button type="primary" block size="large" className="mt-4" onClick={() => navigate('/tenants')}>
                Finish
              </Button>
            </Card>
          )}
        </div>
      </AppLayout>
    )
  }

  // ---- 3-step form (antd) ----
  const stepItems = formSteps.map((label, i) => {
    const stepNum = i + 1
    const done = stepNum < step
    const active = stepNum === step
    const filled = done || active
    return {
      title: label,
      icon: (
        <span className="ct-step-dot" style={{ background: filled ? KANVAS_GRADIENT : '#f0e8fa', color: filled ? '#fff' : '#9b87b5' }}>
          {done ? <Check size={16} /> : stepNum}
        </span>
      ),
    }
  })

  const primaryBtnStyle = { background: KANVAS_GRADIENT, border: 'none' }
  const cancelBtnStyle = { background: '#f5f4f8', color: '#7b6b94', border: '1.5px solid #ede8f5' }

  return (
    <AppLayout title="Create Tenant" subtitle={`Step ${step} of 3`}>
      <>
        <Button type="text" className="mb-3" icon={<ArrowLeft size={16} />} onClick={() => navigate('/tenants')} style={{ color: '#7b6b94', fontWeight: 600 }}>
          Back to Tenants
        </Button>

        <Card className="p-0 ct-wizard-card">
          <div className="ct-wizard-header">
            <h2 className="font-display ct-wizard-title">Create New Tenant</h2>
            <Steps current={step - 1} items={stepItems} titlePlacement="vertical" />
          </div>

          <div className="p-4">
            {step === 1 && (
              <Form layout="vertical" className="mx-auto" style={{ maxWidth: 512 }}>
                <div className="d-flex flex-column gap-1">
                  <h3 className="font-display fs-6 fw-bold text-dark mb-2">Organization Information</h3>
                  <Form.Item label="Organization Name *">
                    <Input size="large" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="SagarSoft" />
                  </Form.Item>
                  <div className="row g-3">
                    <div className="col-6">
                      <Form.Item label="Tenant Code *">
                        <Input size="large" value={tenantCode} onChange={(e) => setTenantCode(normalizeCode(e.target.value))} placeholder="sagarsoft" />
                      </Form.Item>
                    </div>
                    <div className="col-6">
                      <Form.Item label="Industry">
                        <Select
                          size="large"
                          value={industry}
                          onChange={setIndustry}
                          options={industries.map((i) => ({ value: i, label: i }))}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-6">
                      <Form.Item label="User Limit *">
                        <Input size="large" type="number" value={userLimit} onChange={(e) => setUserLimit(e.target.value)} placeholder="100" />
                      </Form.Item>
                    </div>
                    <div className="col-6">
                      <Form.Item label="Country">
                        <Input size="large" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" />
                      </Form.Item>
                    </div>
                  </div>
                  <Form.Item label="Address">
                    <Input.TextArea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Hyderabad, Telangana" />
                  </Form.Item>
                </div>

                <div className="d-flex flex-column gap-1 border-top pt-4 mt-2">
                  <h3 className="font-display fs-6 fw-bold text-dark mb-2">Billing Contact Details</h3>
                  <Form.Item label="Billing Contact Name">
                    <Input size="large" value={billingContactName} onChange={(e) => setBillingContactName(e.target.value)} placeholder="Ravi Kumar" />
                  </Form.Item>
                  <div className="row g-3">
                    <div className="col-6">
                      <Form.Item label="Billing Email *">
                        <Input
                          size="large"
                          type="email"
                          value={billingEmail}
                          onChange={(e) => setBillingEmail(e.target.value)}
                          placeholder="billing@sagarsoft.com"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-6">
                      <Form.Item label="Phone">
                        <Input size="large" value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} placeholder="+91 98765 43210" />
                      
                      </Form.Item>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column gap-1 border-top pt-4 mt-2">
                  <h3 className="font-display fs-6 fw-bold text-dark mb-2">LMS Admin Details</h3>
                  <div className="row g-3">
                    <div className="col-6">
                      <Form.Item label="Admin Name *">
                        <Input size="large" value={lmsAdminName} onChange={(e) => setLmsAdminName(e.target.value)} placeholder="Sneha Reddy" />
                      </Form.Item>
                    </div>
                    <div className="col-6">
                      <Form.Item label="Admin Email *">
                        <Input
                          size="large"
                          type="email"
                          value={lmsAdminEmail}
                          onChange={(e) => setLmsAdminEmail(e.target.value)}
                          placeholder="admin@sagarsoft.com"
                        />
                      </Form.Item>
                    </div>
                  </div>
                </div>

                {orgError && <p className="small text-danger mb-0">{orgError}</p>}
              </Form>
            )}

            {step === 2 && (
              <div>
                <h3 className="mb-1 font-display fs-5 fw-bold text-dark">Select Courses</h3>
                <p className="mb-3 small text-secondary">Choose which published courses this tenant should have access to.</p>

                <div className="mb-3" style={{ maxWidth: 384 }}>
                  <Input
                    size="large"
                    value={courseQuery}
                    onChange={(e) => setCourseQuery(e.target.value)}
                    placeholder="Search courses..."
                    prefix={<Search size={14} color="#9b87b5" />}
                  />
                </div>
                <div className="rounded-2 border">
                  {availableCourses.map((c, i) => (
                    <label key={c.id} className={`d-flex align-items-center gap-3 px-3 py-2 mb-0 ${i > 0 ? 'border-top' : ''}`} style={{ cursor: 'pointer' }}>
                      <Checkbox checked={selectedCourseIds.includes(c.id)} onChange={() => toggleCourse(c.id)} />
                      <span className="flex-grow-1 small fw-medium text-dark">{c.name}</span>
                      <span className="text-secondary" style={{ fontSize: 12 }}>
                        {c.category}
                      </span>
                    </label>
                  ))}
                  {availableCourses.length === 0 && (
                    <div className="py-4">
                      <Empty description="No courses match your search." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    </div>
                  )}
                </div>
                <p className="mt-3 small text-secondary mb-0">
                  Selected: {selectedCourseIds.length} course{selectedCourseIds.length === 1 ? '' : 's'}
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="mx-auto" style={{ maxWidth: 512 }}>
                <h3 className="mb-3 font-display fs-5 fw-bold text-dark">Review & Proceed</h3>
                <Descriptions column={1} bordered size="small" styles={{ label: { width: 160, color: '#7b6b94' } }}>
                  <Descriptions.Item label="Organization">{orgName}</Descriptions.Item>
                  <Descriptions.Item label="Tenant Code">
                    <span style={{ fontFamily: 'monospace' }}>{tenantCode}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Industry">{industry}</Descriptions.Item>
                  <Descriptions.Item label="User Limit">{userLimit}</Descriptions.Item>
                  <Descriptions.Item label="LMS Admin">
                    {lmsAdminName} ({lmsAdminEmail})
                  </Descriptions.Item>
                </Descriptions>

                <div className="mt-3">
                  <p className="mb-2 small fw-semibold text-dark">Courses ({selectedCourses.length})</p>
                  {selectedCourses.length === 0 ? (
                    <p className="small text-secondary mb-0">No courses selected — you can assign courses later from the Tenants page.</p>
                  ) : (
                    <div className="d-flex flex-column gap-2 small">
                      {selectedCourses.map((c) => (
                        <div key={c.id} className="d-flex align-items-center gap-2 text-secondary">
                          <Check size={13} className="text-success" /> {c.name}
                        </div>
                      ))}
                    </div>
                  )}
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2 border p-3 text-center h-100">
      <p className="font-display fs-6 fw-bold text-dark mb-0">{value}</p>
      <p className="text-secondary mb-0" style={{ fontSize: 12 }}>
        {label}
      </p>
    </div>
  )
}
