import { useEffect, useMemo, useState } from 'react'
import { Modal as AntModal, Spin } from 'antd'
import { Building2, BookOpen, Calendar, Check, ChevronDown, ChevronUp, Copy, Factory, Users, X } from 'lucide-react'
import { GROUP_STYLE, DEFAULT_GROUP_STYLE } from '../lms-content/CoursesTab'
import { Notice } from '../ui/State'
import { useData } from '../../context/DataContext'
import { api, errorMessage, type Course, type Tenant, type TenantDetail } from '../../api'
import './TenantDetailsModal.css'

const UNLIMITED = 999_999

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  if (!text) return null
  return (
    <button
      type="button"
      className="tdm-copy"
      aria-label={label}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          window.setTimeout(() => setDone(false), 1400)
        })
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function Person({ name, email, role }: { name: string; email: string; role: string }) {
  if (!name && !email) return null
  return (
    <div className="tdm-person">
      <span className="tdm-avatar">{(name || email).trim()[0]?.toUpperCase()}</span>
      <div className="tdm-person-text">
        <div className="tdm-person-name">{name || email}</div>
        {name && email && <div className="tdm-person-email">{email}</div>}
      </div>
      <span className="tdm-role">{role}</span>
      <CopyButton text={email} label={`Copy ${role} email`} />
    </div>
  )
}

/** Read-only "Tenant details" popup opened from the Tenants table's preview button. */
export function TenantDetailsModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { courses: allCourses, courseOptions } = useData()
  const [detail, setDetail] = useState<TenantDetail | null>(null)
  const [error, setError] = useState('')
  const [opened, setOpened] = useState<Set<string>>(() => new Set(['Organization-wide']))

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

  const t = detail ?? tenant
  const unlimited = t.userLimit >= UNLIMITED
  const percent = unlimited || !(t.userLimit > 0) ? 0 : Math.min(100, Math.round((t.users / t.userLimit) * 100))
  const tenantCourses = useMemo(() => {
    const ids = new Set((detail?.courses ?? []).map((c) => c.id))
    return allCourses.filter((c) => ids.has(c.id))
  }, [detail, allCourses])
  const groups = useMemo(() => {
    const types = [...courseOptions.categoryTypes, ...Array.from(new Set(tenantCourses.map((c) => c.category))).filter((x) => !courseOptions.categoryTypes.includes(x))]
    return types.map((type) => ({ type, items: tenantCourses.filter((c: Course) => c.category === type) })).filter((g) => g.items.length > 0)
  }, [tenantCourses, courseOptions.categoryTypes])
  const courseTotal = detail ? detail.courses.length : tenant.courseCount
  const toggle = (type: string) =>
    setOpened((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })

  return (
    <AntModal
      open
      centered
      footer={null}
      closable={false}
      onCancel={onClose}
      width={620}
      className="tdm-modal"
      styles={{ container: { padding: 0, overflow: 'hidden', borderRadius: 18 }, body: { padding: 0 } }}
    >
      <div className="tdm-hero">
        <div className="tdm-hero-top">
          <span className="tdm-eyebrow">
            <Building2 size={14} /> TENANT DETAILS
          </span>
          <button type="button" className="tdm-close" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <h2 className="tdm-name">{t.name}</h2>
        <div className="tdm-chips">
          <span className={`tdm-chip is-status${t.status === 'Suspended' ? ' is-suspended' : ''}`}>
            <i /> {t.status}
          </span>
          <span className="tdm-chip is-code">Code {t.code}</span>
          {t.createdOn && (
            <span className="tdm-chip">
              <Calendar size={13} /> Since {t.createdOn}
            </span>
          )}
        </div>
      </div>

      <div className="tdm-body">
        {error && <Notice tone="error">{error}</Notice>}

        <div className="tdm-stats">
          <div className="tdm-stat">
            <span className="tdm-stat-label">
              <Users size={14} /> Users
            </span>
            <b>
              {t.users ?? 0}
              <small> / {unlimited ? '∞' : (t.userLimit ?? 0)}</small>
            </b>
            {!unlimited && (
              <div className="tdm-bar">
                <div className={percent >= 90 ? 'is-hot' : ''} style={{ width: `${percent}%` }} />
              </div>
            )}
          </div>
          <div className="tdm-stat">
            <span className="tdm-stat-label">
              <BookOpen size={14} /> Courses
            </span>
            <b>{courseTotal ?? 0}</b>
          </div>
          <div className="tdm-stat">
            <span className="tdm-stat-label">
              <Factory size={14} /> Industry
            </span>
            <b className="is-text">{t.industry || '—'}</b>
          </div>
        </div>

        <div className="tdm-scroll">
        <h3 className="tdm-heading">People</h3>
        <div className="tdm-card">
          {!t.lmsAdminName && !t.lmsAdminEmail && !t.billingContactName && !t.billingEmail ? (
            <p className="tdm-empty">No contacts on file.</p>
          ) : (
            <>
              <Person name={t.lmsAdminName} email={t.lmsAdminEmail} role="LMS admin" />
              <Person name={t.billingContactName} email={t.billingEmail} role="Billing" />
            </>
          )}
        </div>

        <h3 className="tdm-heading">
          Courses <span>· {courseTotal ?? 0}</span>
        </h3>
        {!detail && !error ? (
          <div className="py-3 text-center">
            <Spin size="small" />
          </div>
        ) : groups.length === 0 ? (
          <div className="tdm-card">
            <p className="tdm-empty">No courses assigned.</p>
          </div>
        ) : (
          <div className="tdm-groups">
            {groups.map(({ type, items }) => {
              const gs = GROUP_STYLE[type] ?? DEFAULT_GROUP_STYLE
              const open = opened.has(type)
              return (
                <section key={type} className={`tdm-group${open ? ' is-open' : ''}`} style={{ ['--accent' as string]: gs.color, ['--accent-bg' as string]: gs.bg }}>
                  <button type="button" className="tdm-group-head" aria-expanded={open} onClick={() => toggle(type)}>
                    <span className="tdm-group-icon">
                      <BookOpen size={16} />
                    </span>
                    <span className="tdm-group-title">{type}</span>
                    <span className="tdm-group-count">
                      {items.length} {items.length === 1 ? 'course' : 'courses'}
                    </span>
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {open && (
                    <div className="tdm-group-body">
                      {items.map((c) => (
                        <span key={c.id} className="tdm-course">
                          <Check size={13} /> {c.name} <code>{c.code}</code>
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
        </div>
      </div>
    </AntModal>
  )
}
