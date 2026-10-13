import { useState } from 'react'
import { BookOpen, Check, ChevronDown, ChevronRight, Star } from 'lucide-react'
import { GROUP_STYLE, DEFAULT_GROUP_STYLE } from '../lms-content/CoursesTab'
import { useData } from '../../context/DataContext'
import { API_ORIGIN, type Course } from '../../api'
import '../../pages/CreateTenant.css'

/** The category group that starts open; every other group starts closed. */
const DEFAULT_OPEN = 'Organization-wide'

/** Course picker for the tenant wizards: courses grouped by category type (Organization-wide, Function-based,
 *  …) in collapsible sections, the same grouping as the LMS Content courses tab. Organization-wide starts open, the other groups closed. */
export function CourseGroupPicker({
  courses,
  selected,
  lockedIds,
  isNew,
  onToggle,
}: {
  courses: Course[]
  selected: number[]
  lockedIds?: Set<number>
  /** Courses added during this edit; they get a star. */
  isNew?: (id: number) => boolean
  onToggle: (id: number) => void
}) {
  const { courseOptions } = useData()
  const [opened, setOpened] = useState<Set<string>>(() => new Set([DEFAULT_OPEN]))

  // Known category types first, in their usual order, then any other category a course happens to have.
  const types = [...courseOptions.categoryTypes, ...Array.from(new Set(courses.map((c) => c.category))).filter((t) => !courseOptions.categoryTypes.includes(t))]

  const toggleGroup = (type: string) =>
    setOpened((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })

  return (
    <div className="d-flex flex-column gap-3">
      {types.map((type) => {
        const group = courses.filter((c) => c.category === type)
        if (group.length === 0) return null
        const gs = GROUP_STYLE[type] ?? DEFAULT_GROUP_STYLE
        const isCollapsed = !opened.has(type)
        const pickedHere = group.filter((c) => selected.includes(c.id)).length
        return (
          <div key={type} className="course-group" style={{ ['--accent' as string]: gs.color, ['--accent-bg' as string]: gs.bg }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleGroup(type)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') toggleGroup(type)
              }}
              className="course-group-header d-flex align-items-center justify-content-between"
            >
              <div className="d-flex align-items-center gap-3 min-w-0">
                <span className="course-group-icon">{gs.icon}</span>
                <div className="min-w-0">
                  <h3 className="course-group-title mb-0">{type}</h3>
                  {gs.blurb && <div className="course-group-blurb">{gs.blurb}</div>}
                </div>
              </div>
              <div className="d-flex align-items-center gap-3 flex-shrink-0">
                <span className="course-group-count">
                  {pickedHere} of {group.length} selected
                </span>
                <span className="course-group-chevron">{isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>
              </div>
            </div>
            {!isCollapsed && (
              <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3 p-3">
                {group.map((c) => {
                  const checked = selected.includes(c.id)
                  const locked = lockedIds?.has(c.id) ?? false
                  return (
                    <div key={c.id} className="col">
                      <div
                        role="checkbox"
                        aria-checked={checked}
                        aria-disabled={locked}
                        tabIndex={0}
                        className={`ct-course-card${checked ? ' is-selected' : ''}${locked ? ' is-locked' : ''}`}
                        onClick={() => onToggle(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onToggle(c.id)
                          }
                        }}
                      >
                        {c.coverImage ? (
                          <img src={`${API_ORIGIN}/courses/covers/${c.coverImage}`} alt="" className="ct-course-thumb" />
                        ) : (
                          <div className="ct-course-thumb ct-course-thumb-empty">
                            <BookOpen size={20} color="#fff" />
                          </div>
                        )}
                        <div className="flex-grow-1 min-w-0">
                          <div className="ct-course-name text-truncate" title={c.name}>
                            {c.name}
                          </div>
                          <div className="ct-course-meta text-truncate">{c.code}</div>
                        </div>
                        {isNew?.(c.id) && (
                          <span className="ct-new-star" title="Newly added">
                            <Star size={13} fill="currentColor" /> New
                          </span>
                        )}
                        <span className="ct-course-check">{checked && <Check size={14} />}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Review-step course list: the selected courses grouped by category type, each group with its coloured
 *  header and a chip per course (a star instead of the tick for courses added during this edit). */
export function ReviewCourseGroups({ courses, isNew }: { courses: Course[]; isNew?: (id: number) => boolean }) {
  const { courseOptions } = useData()
  const [opened, setOpened] = useState<Set<string>>(() => new Set([DEFAULT_OPEN]))
  const toggleGroup = (type: string) =>
    setOpened((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  const types = [...courseOptions.categoryTypes, ...Array.from(new Set(courses.map((c) => c.category))).filter((t) => !courseOptions.categoryTypes.includes(t))]

  return (
    <div className="d-flex flex-column gap-3">
      {types.map((type) => {
        const group = courses.filter((c) => c.category === type)
        if (group.length === 0) return null
        const gs = GROUP_STYLE[type] ?? DEFAULT_GROUP_STYLE
        return (
          <div key={type}>
            <div
              role="button"
              tabIndex={0}
              aria-expanded={opened.has(type)}
              onClick={() => toggleGroup(type)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleGroup(type)
                }
              }}
              className="d-flex align-items-center gap-2 mb-2"
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <span className="d-inline-flex align-items-center justify-content-center rounded-2" style={{ width: 28, height: 28, background: gs.bg, color: gs.color }}>
                {gs.icon}
              </span>
              <span className="fw-semibold" style={{ fontSize: 14, color: '#1a1228' }}>
                {type}
              </span>
              <span className="course-group-count">{group.length}</span>
              <span className="ms-auto" style={{ color: '#9b87b5' }}>
                {opened.has(type) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </div>
            {opened.has(type) && (
              <div className="d-flex flex-wrap gap-2">
                {group.map((c) => (
                  <span key={c.id} className="ct-review-chip">
                    {isNew?.(c.id) ? <Star size={13} fill="currentColor" /> : <Check size={13} />} {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
