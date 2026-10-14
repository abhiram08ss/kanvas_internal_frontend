import { useEffect, useMemo, useState } from 'react'
import { Spin } from 'antd'
import { BookOpen } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Notice } from '../ui/State'
import { ReviewCard } from './ReviewParts'
import { ReviewCourseGroups } from './CourseGroupPicker'
import '../../pages/CreateTenant.css'
import { useData } from '../../context/DataContext'
import { api, errorMessage, type Tenant, type TenantDetail } from '../../api'

const UNLIMITED = 999_999

function withContact(name: string, email: string): string {
  if (name && email) return `${name} (${email})`
  return name || email || '—'
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="td-row">
      <div className="td-label">{label}</div>
      <div className="td-value">{children}</div>
    </div>
  )
}

/** Read-only "Tenant details" popup opened from the Tenants table's view button. */
export function TenantDetailsModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { courses: allCourses } = useData()
  const [detail, setDetail] = useState<TenantDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .tenantDetail(tenant.id)
      .then((d) => !cancelled && setDetail(d))
      .catch((e) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [tenant.id])

  // The tenant's courses, resolved to full course records so they can be grouped by category.
  const tenantCourses = useMemo(() => {
    const ids = new Set((detail?.courses ?? []).map((c) => c.id))
    return allCourses.filter((c) => ids.has(c.id))
  }, [detail, allCourses])

  const t = detail ?? tenant
  const unlimited = t.userLimit >= UNLIMITED

  return (
    <Modal title="Tenant details" onClose={onClose} size="lg">
      {error && <Notice tone="error">{error}</Notice>}

      <div className="td-table">
        <Row label="Organization">
          <strong>{t.name}</strong>
        </Row>
        <Row label="Tenant Code">{t.code}</Row>
        <Row label="Industry">{t.industry || '—'}</Row>
        <Row label="User Limit">{unlimited ? 'Unlimited' : t.userLimit}</Row>
        <Row label="LMS Admin">{withContact(t.lmsAdminName, t.lmsAdminEmail)}</Row>
        <Row label="Billing Email">{withContact(t.billingContactName, t.billingEmail)}</Row>
        <Row label="Status">{t.status}</Row>
      </div>

      <div className="mt-3">
        <ReviewCard icon={<BookOpen size={18} />} title={`Courses (${detail ? detail.courses.length : tenant.courseCount})`}>
          {!detail && !error ? (
            <div className="py-3 text-center">
              <Spin size="small" />
            </div>
          ) : tenantCourses.length === 0 ? (
            <p className="small mb-0" style={{ color: '#727587' }}>
              No courses assigned.
            </p>
          ) : (
            <ReviewCourseGroups courses={tenantCourses} />
          )}
        </ReviewCard>
      </div>
    </Modal>
  )
}
