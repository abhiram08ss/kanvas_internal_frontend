import { useEffect, useMemo, useState } from 'react'
import { Button, Spin } from 'antd'
import { Modal } from '../ui/Modal'
import { Notice } from '../ui/State'
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
export function TenantDetailsModal({
  tenant,
  canManage,
  onClose,
  onEdit,
}: {
  tenant: Tenant
  canManage: boolean
  onClose: () => void
  onEdit: () => void
}) {
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

  // Courses grouped by category, in the same order the app lists categories.
  const groups = useMemo(() => {
    const byId = new Map(allCourses.map((c) => [c.id, c]))
    const counts = new Map<string, number>()
    for (const tc of detail?.courses ?? []) {
      const category = byId.get(tc.id)?.category ?? 'Other'
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
    return [...counts.entries()]
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

      <h4 className="td-heading">Courses ({detail ? detail.courses.length : tenant.courseCount})</h4>
      {!detail && !error ? (
        <div className="py-3 text-center">
          <Spin size="small" />
        </div>
      ) : groups.length === 0 ? (
        <p className="small mb-0" style={{ color: '#727587' }}>
          No courses assigned.
        </p>
      ) : (
        <div className="td-groups">
          {groups.map(([category, n]) => (
            <div key={category} className="td-group">
              <span>{category}</span>
              <span className="td-count">{n}</span>
            </div>
          ))}
        </div>
      )}

      <div className="td-footer">
        <Button onClick={onClose}>Close</Button>
        {canManage && (
          <Button type="primary" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
    </Modal>
  )
}
