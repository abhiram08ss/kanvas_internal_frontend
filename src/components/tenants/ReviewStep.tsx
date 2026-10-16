import type { ReactNode } from 'react'
import { BookOpen, Building2, CheckCircle2, Lightbulb, Receipt, UserCog } from 'lucide-react'
import { GROUP_STYLE, DEFAULT_GROUP_STYLE } from '../lms-content/CoursesTab'
import { CourseTile, initials } from './CourseSelectStep'
import { useData } from '../../context/DataContext'
import type { Course } from '../../api'
import './ReviewStep.css'

export type ReviewRowData = [label: string, value: string, options?: { mono?: boolean }]

function Card({ icon, title, count, children }: { icon: ReactNode; title: string; count?: number; children: ReactNode }) {
  return (
    <section className="tc-card rv-card">
      <div className="rv-head">
        <span className="tc-card-icon">{icon}</span>
        <h3 className="tc-card-title">
          {title}
          {count !== undefined && <span className="rv-count"> · {count}</span>}
        </h3>
      </div>
      {children}
    </section>
  )
}

function Fields({ rows, columns }: { rows: ReviewRowData[]; columns: 'three' | 'list' }) {
  return (
    <dl className={`rv-fields is-${columns}`}>
      {rows.map(([label, value, opts]) => (
        <div key={label} className="rv-field">
          <dt>{label}</dt>
          <dd className={`${value ? '' : 'is-empty '}${opts?.mono ? 'is-mono' : ''}`}>{value || 'Not provided'}</dd>
        </div>
      ))}
    </dl>
  )
}

export interface ReviewSummary {
  name: string
  code: string
  industry: string
  country: string
  users: string
  status: string
}

/**
 * Last step of the Create / Edit tenant pages: a summary header, the organization / billing / administrator details,
 * the chosen courses, and two side notes. Every card has an Edit shortcut back to its step.
 */
export function ReviewStep({
  mode,
  summary,
  organization,
  billing,
  admin,
  courses,
  isNew,
  removed = [],
  emptyCoursesNote,
  error,
}: {
  mode: 'create' | 'edit'
  summary: ReviewSummary
  organization: ReviewRowData[]
  billing: ReviewRowData[]
  admin: ReviewRowData[]
  courses: Course[]
  isNew?: (id: number) => boolean
  removed?: Course[]
  emptyCoursesNote: string
  error?: string
}) {
  const { courseOptions } = useData()
  const types = [...courseOptions.categoryTypes, ...Array.from(new Set(courses.map((c) => c.category))).filter((t) => !courseOptions.categoryTypes.includes(t))]
  const groups = types.map((t) => ({ type: t, items: courses.filter((c) => c.category === t) })).filter((g) => g.items.length > 0)
  const creating = mode === 'create'

  return (
    <div className="rv-layout">
      <div className="rv-main">
        <section className="tc-card rv-summary">
          <span className="rv-avatar">{initials(summary.name || 'Organization name')}</span>
          <div className="rv-summary-text">
            <div className="rv-summary-name">{summary.name || 'Organization name'}</div>
            <div className="rv-chips">
              <span className="rv-chip is-code">{summary.code || 'TENANT-CODE'}</span>
              {summary.industry && <span className="rv-chip">{summary.industry}</span>}
              {summary.country && <span className="rv-chip">{summary.country}</span>}
              {summary.status && <span className={`rv-chip is-status${summary.status.startsWith('Suspended') ? ' is-suspended' : ''}`}>{summary.status}</span>}
            </div>
          </div>
          <div className="rv-stats">
            <div>
              <span>Categories</span>
              <b>{groups.length}</b>
            </div>
            <div>
              <span>Courses</span>
              <b>{courses.length}</b>
            </div>
            <div>
              <span>User limit</span>
              <b>{summary.users}</b>
            </div>
          </div>
        </section>

        <Card icon={<Building2 size={18} />} title="Organization">
          <Fields rows={organization} columns="three" />
        </Card>

        <div className="rv-pair">
          <Card icon={<Receipt size={18} />} title="Billing Contact">
            <Fields rows={billing} columns="list" />
          </Card>
          <Card icon={<UserCog size={18} />} title="LMS Administrator">
            <Fields rows={admin} columns="list" />
          </Card>
        </div>

        <Card icon={<BookOpen size={18} />} title="Courses" count={courses.length}>
          {groups.length === 0 ? (
            <p className="rv-empty">{emptyCoursesNote}</p>
          ) : (
            groups.map(({ type, items }) => {
              const gs = GROUP_STYLE[type] ?? DEFAULT_GROUP_STYLE
              return (
                <div key={type} className="rv-group" style={{ ['--accent' as string]: gs.color, ['--accent-bg' as string]: gs.bg }}>
                  <div className="rv-group-title">
                    <i /> {type} · {items.length}
                  </div>
                  <div className="rv-course-grid">
                    {items.map((c) => (
                      <div key={c.id} className="rv-course">
                        <CourseTile course={c} />
                        <span className="rv-course-text">
                          <span className="rv-course-name">
                            {c.name}
                            {isNew?.(c.id) && <em>New</em>}
                          </span>
                          <span className="rv-course-code">{c.code}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
          {removed.length > 0 && (
            <div className="rv-removed">
              <p>Will be removed ({removed.length})</p>
              <div>
                {removed.map((c) => (
                  <span key={c.id}>{c.name}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
        {error && <p className="rv-error">{error}</p>}
      </div>

      <aside className="rv-aside">
        <section className="rv-ready">
          <span className="rv-ready-icon">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <p className="rv-aside-label">Ready to go</p>
            <p className="rv-aside-text">
              {creating ? (
                <>
                  Everything checks out — required details are filled in and <strong>{courses.length} {courses.length === 1 ? 'course is' : 'courses are'}</strong> picked.
                </>
              ) : (
                <>
                  Required details are filled in. Press <strong>Save changes</strong> to update this tenant
                  {removed.length > 0 ? ` and remove ${removed.length} ${removed.length === 1 ? 'course' : 'courses'}` : ''}.
                </>
              )}
            </p>
          </div>
        </section>

        <section className="rv-note">
          <span className="rv-note-icon">
            <Lightbulb size={17} />
          </span>
          <div>
            <p className="rv-aside-label">Good to know</p>
            <p className="rv-aside-text">
              When you click <strong>{creating ? 'Create tenant' : 'Save changes'}</strong>:
            </p>
            <ul>
              {creating ? (
                <>
                  <li>The workspace is set up for {summary.users} users.</li>
                  <li>
                    The {courses.length} {courses.length === 1 ? 'course is' : 'courses are'} added to its catalog.
                  </li>
                  <li>The LMS admin gets sign-in details after setup.</li>
                </>
              ) : (
                <>
                  <li>The organization, billing and admin details are updated.</li>
                  <li>Added courses join its catalog; unticked ones are removed.</li>
                  <li>A status change (Active / Suspended) is applied.</li>
                </>
              )}
            </ul>
            <p className="rv-aside-foot">You can change any of this later from the tenant page.</p>
          </div>
        </section>
      </aside>
    </div>
  )
}
