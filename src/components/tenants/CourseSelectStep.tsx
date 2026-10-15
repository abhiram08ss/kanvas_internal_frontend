import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Info, Search, SquareCheckBig, X } from 'lucide-react'
import { GROUP_STYLE, DEFAULT_GROUP_STYLE } from '../lms-content/CoursesTab'
import { useData } from '../../context/DataContext'
import { API_ORIGIN, type Course } from '../../api'
import { COURSE_NAME_MAX, validateCourseSearch } from '../../utils/validation'
import './CourseSelectStep.css'

/** The category group that starts open; every other group starts closed. */
const DEFAULT_OPEN = 'Organization-wide'

/** "Organization-wide" -> "OW", "Industry and sector" -> "IS", "BBC" -> "BB". */
export function initials(text: string): string {
  const words = text.split(/[\s-]+/).filter((w) => w && w.toLowerCase() !== 'and')
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? '?').slice(0, 2).toUpperCase()
}

/** Cover image of a course, or its initials when it has none (or the file cannot be loaded). */
export function CourseTile({ course }: { course: Course }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="cs-card-tile">
      {course.coverImage && !failed ? (
        <img src={`${API_ORIGIN}/courses/covers/${course.coverImage}`} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        initials(course.name)
      )}
    </span>
  )
}

/**
 * Step 2 of the tenant wizards: pick the courses. A toolbar (search, counts, select all / clear, category
 * chips), collapsible category groups of course cards with per-group "Select all", and a side panel that
 * summarises what is picked. Used by both Create and Edit tenant.
 */
export function CourseSelectStep({
  courses,
  selected,
  onChange,
  tenantName,
  tenantCode,
  isNew,
  removedCount = 0,
}: {
  courses: Course[]
  selected: number[]
  onChange: (ids: number[]) => void
  tenantName: string
  tenantCode: string
  /** Edit only: courses added during this edit get a "New" tag. */
  isNew?: (id: number) => boolean
  /** Edit only: how many of the tenant's existing courses have been unticked. */
  removedCount?: number
}) {
  const { courseOptions } = useData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [opened, setOpened] = useState<Set<string>>(() => new Set([DEFAULT_OPEN]))

  const types = useMemo(
    () => [...courseOptions.categoryTypes, ...Array.from(new Set(courses.map((c) => c.category))).filter((t) => !courseOptions.categoryTypes.includes(t))],
    [courseOptions.categoryTypes, courses],
  )
  // The search matches a course name or code; invalid characters raise a message and the list is left unfiltered.
  const searchError = validateCourseSearch(query)
  const needle = searchError ? '' : query.trim().toLowerCase()
  const matches = (c: Course) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle)
  const visible = courses.filter((c) => matches(c) && (category === 'All' || c.category === category))
  const countFor = (type: string) => courses.filter((c) => c.category === type).length
  const picked = new Set(selected)

  const toggle = (id: number) => onChange(picked.has(id) ? selected.filter((x) => x !== id) : [...selected, id])
  const selectMany = (ids: number[]) => onChange(Array.from(new Set([...selected, ...ids])))
  const toggleGroup = (type: string) =>
    setOpened((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })

  const summary = types.map((t) => ({ type: t, n: courses.filter((c) => c.category === t && picked.has(c.id)).length })).filter((r) => r.n > 0)

  return (
    <div className="cs-grid">
      <div className="cs-main">
        <section className="cs-toolbar">
          <div className="cs-toolbar-row">
            <label className={`cs-search${searchError ? ' has-error' : ''}`}>
              <Search size={16} />
              <input value={query} maxLength={COURSE_NAME_MAX} onChange={(e) => setQuery(e.target.value)} placeholder="Search by course name or code" aria-invalid={!!searchError} />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                  <X size={14} />
                </button>
              )}
            </label>
            <span className="cs-total">{courses.length} courses</span>
            <span className="cs-selected-pill">
              <Check size={14} /> {selected.length} selected{isNew && removedCount > 0 ? ` · ${removedCount} removed` : ''}
            </span>
            <span className="cs-divider" />
            <button type="button" className="cs-btn" onClick={() => selectMany(visible.map((c) => c.id))} disabled={visible.length === 0}>
              <SquareCheckBig size={15} /> Select all{category !== 'All' || needle ? ' shown' : ''}
            </button>
            <button type="button" className="cs-btn is-danger" onClick={() => onChange([])} disabled={selected.length === 0}>
              <X size={15} /> Clear
            </button>
          </div>
          {searchError && <div className="cs-search-error">{searchError}</div>}
          <div className="cs-chips">
            {['All', ...types].map((t) => (
              <button key={t} type="button" className={`cs-chip${category === t ? ' is-active' : ''}`} onClick={() => setCategory(t)}>
                {t}
                <span>{t === 'All' ? courses.length : countFor(t)}</span>
              </button>
            ))}
          </div>
        </section>

        {visible.length === 0 ? (
          <div className="cs-empty">No courses match your filters.</div>
        ) : (
          types.map((type) => {
            const group = visible.filter((c) => c.category === type)
            if (group.length === 0) return null
            const gs = GROUP_STYLE[type] ?? DEFAULT_GROUP_STYLE
            const open = opened.has(type) || needle !== ''
            const pickedHere = courses.filter((c) => c.category === type && picked.has(c.id)).length
            const allInGroup = courses.filter((c) => c.category === type).length
            return (
              <section key={type} className="cs-group" style={{ ['--accent' as string]: gs.color, ['--accent-bg' as string]: gs.bg }}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  className="cs-group-head"
                  onClick={() => toggleGroup(type)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleGroup(type)
                    }
                  }}
                >
                  <span className="cs-group-tile">{initials(type)}</span>
                  <div className="cs-group-text">
                    <div className="cs-group-title">{type}</div>
                    <div className="cs-group-desc">{gs.blurb}</div>
                  </div>
                  <span className="cs-group-count">
                    {pickedHere} of {allInGroup} selected
                  </span>
                  <button
                    type="button"
                    className="cs-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      selectMany(group.map((c) => c.id))
                    }}
                  >
                    Select all
                  </button>
                  <span className="cs-chevron">{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                </div>
                {open && (
                  <div className="cs-cards">
                    {group.map((c) => {
                      const on = picked.has(c.id)
                      return (
                        <button key={c.id} type="button" className={`cs-card${on ? ' is-on' : ''}`} onClick={() => toggle(c.id)} aria-pressed={on}>
                          <CourseTile course={c} />
                          <span className="cs-card-text">
                            <span className="cs-card-name">
                              {c.name}
                              {isNew?.(c.id) && <em>New</em>}
                            </span>
                            <span className="cs-card-code">{c.code}</span>
                          </span>
                          <span className="cs-check">{on && <Check size={13} strokeWidth={3} />}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>

      <aside className="cs-aside">
        <section className="cs-summary">
          <div className="cs-summary-head">
            <h3>Selected courses</h3>
            <span>{selected.length}</span>
          </div>
          <p className="cs-summary-for">
            For <strong>{tenantName || '[Organization name]'}</strong> · <code>[{tenantCode ? tenantCode.toUpperCase() : 'TENANT-CODE'}]</code>
          </p>
          {summary.length === 0 ? (
            <p className="cs-summary-empty">No courses picked yet.</p>
          ) : (
            summary.map((r) => {
              const gs = GROUP_STYLE[r.type] ?? DEFAULT_GROUP_STYLE
              return (
                <div key={r.type} className="cs-summary-row">
                  <span className="cs-dot" style={{ background: gs.color }} />
                  <span>{r.type}</span>
                  <b style={{ color: gs.color, background: gs.bg }}>{r.n}</b>
                </div>
              )
            })
          )}
        </section>
        <div className="cs-note">
          <Info size={16} />
          <p>
            Only published courses are listed. Start with <strong>Organization-wide</strong> — it's core learning every employee needs.
          </p>
        </div>
      </aside>
    </div>
  )
}
