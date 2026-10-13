import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Award,
  BookOpen,
  CheckCircle2,
  Ban,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  LayoutGrid,
  Layers,
  List,
  Pencil,
  ImageOff,
  Eye,
  Check,
  Clock,
  Globe2,
  Briefcase,
  UserCog,
  Factory,
  FolderOpen,
} from 'lucide-react'
import { Select } from 'antd'
import { confirmDialog } from '../ui/confirmOptions'
import { Badge } from '../ui/Badge'
import { ListCard } from '../ui/ListCard'
import { StatCard } from '../ui/StatCard'
import { Toolbar } from '../ui/Toolbar'
import { IconButton } from '../ui/IconButton'
import { ManualCourseModal } from '../courses/ManualCourseModal'
import { CoursePreviewModal } from './CoursePreviewModal'
import { useData, useDataNeeds } from '../../context/DataContext'
import { API_ORIGIN, type CategoryType, type Course, type CourseInput, type CourseModule } from '../../api'

// Per-category look: accent colour, icon and a one-line description for the group header.
export const GROUP_STYLE: Record<string, { color: string; bg: string; icon: ReactNode; blurb: string }> = {
  'Organization-wide': { color: '#5c2d91', bg: '#f1e9fb', icon: <Globe2 size={20} />, blurb: 'Core learning for every employee' },
  'Function-based': { color: '#2563eb', bg: '#e8f0fe', icon: <Briefcase size={20} />, blurb: 'Skills for specific business functions' },
  'Role-based': { color: '#d97706', bg: '#fef3e2', icon: <UserCog size={20} />, blurb: 'Learning paths tied to job roles' },
  'Industry and sector': { color: '#059669', bg: '#e3f7ef', icon: <Factory size={20} />, blurb: 'Domain knowledge for your industry' },
}
export const DEFAULT_GROUP_STYLE = { color: '#5c2d91', bg: '#f1e9fb', icon: <FolderOpen size={20} />, blurb: '' }

const statusFilters = ['All', 'Active', 'Inactive'] as const

function CoverThumb({ cover }: { cover: string | null }) {
  if (cover) {
    return <img src={`${API_ORIGIN}/courses/covers/${cover}`} alt="" className="rounded-2 border flex-shrink-0" style={{ width: 52, height: 52, objectFit: 'cover' }} />
  }
  return (
    <div
      className="d-inline-flex align-items-center justify-content-center rounded-2 border bg-light text-secondary flex-shrink-0"
      style={{ width: 52, height: 52 }}
    >
      <ImageOff size={14} />
    </div>
  )
}

// Only one hover popup is open at a time: opening one closes whichever card's popup is still showing.
let activePopup: { owner: HTMLElement | null; close: () => void } | null = null

function CourseGridCard({
  course,
  modules,
  questionCount,
  onEdit,
  onToggleStatus,
  onPreview,
}: {
  course: Course
  modules: CourseModule[]
  questionCount: number
  onEdit: () => void
  onToggleStatus: () => void
  onPreview: () => void
}) {
  const outcomes = (course.learningOutcomes ?? []).filter(Boolean)
  const meta = [
    course.durationHours != null ? `${course.durationHours} total hours` : null,
    course.level,
    `${modules.length} ${modules.length === 1 ? 'module' : 'modules'}`,
    // Without quiz questions there is nothing to score, so neither the question count nor a pass score is shown.
    ...(questionCount > 0 ? [`${questionCount} ${questionCount === 1 ? 'question' : 'questions'}`, `Pass score ${course.passScore}%`] : []),
  ].filter(Boolean)
  // Hover details sit beside the card. Positioned with `fixed` from the card's rect (and clamped under the
  // page header), so it works inside the grid's own scroll container, which a normal popover can't.
  const cardRef = useRef<HTMLDivElement>(null)
  const [popup, setPopup] = useState<{ top: number; left: number; maxHeight: number } | null>(null)
  const POPUP_W = 320
  // Closing is delayed so the pointer can cross the gap onto the popup (to select/copy its text).
  const closeTimer = useRef<number | undefined>(undefined)
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setPopup(null), 200)
  }
  const keepOpen = () => window.clearTimeout(closeTimer.current)
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])
  const hidePopup = () => {
    window.clearTimeout(closeTimer.current)
    setPopup(null)
  }
  const showPopup = () => {
    keepOpen()
    if (activePopup && activePopup.owner !== cardRef.current) activePopup.close()
    activePopup = { owner: cardRef.current, close: hidePopup }
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // The grid scrolls inside its own area; the popup must stay within it, never over the toolbar above.
    const area = el.closest('.course-scroll-area')?.getBoundingClientRect()
    const areaTop = area?.top ?? 0
    const areaBottom = area?.bottom ?? window.innerHeight
    if (r.bottom <= areaTop || r.top >= areaBottom) {
      setPopup(null) // card scrolled out of view
      return
    }
    const left = r.right + 12 + POPUP_W <= window.innerWidth ? r.right + 12 : Math.max(8, r.left - 12 - POPUP_W)
    const top = Math.min(Math.max(r.top, areaTop), Math.max(areaTop, areaBottom - 160))
    setPopup({ top, left, maxHeight: Math.max(160, areaBottom - top - 8) })
  }
  // Keep the popup attached to its card while any ancestor scrolls (capture catches the grid's own scroller).
  const open = popup !== null
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', showPopup, true)
    window.addEventListener('resize', showPopup)
    return () => {
      window.removeEventListener('scroll', showPopup, true)
      window.removeEventListener('resize', showPopup)
    }
  }, [open])
  const details = (
    <div style={{ width: POPUP_W - 32 }}>
      <div className="fw-bold mb-2" style={{ fontSize: 16, color: '#1a1228' }}>
        {course.name}
      </div>
      <div className="d-flex align-items-center gap-2 mb-2">
        <Badge tone="purple">{course.category}</Badge>
        <Badge>{course.status}</Badge>
      </div>
      <div className="small mb-2" style={{ color: '#9b87b5' }}>
        {meta.join(' · ')}
      </div>
      {course.description && (
        <div className="mb-2" style={{ color: '#3d3450', fontSize: 14 }}>
          {course.description}
        </div>
      )}
      {modules.length > 0 && (
        <div className="mb-2">
          <div className="fw-semibold mb-1" style={{ fontSize: 13, color: '#1a1228' }}>
            Inside this course
          </div>
          <ol className="mb-0 ps-3" style={{ fontSize: 13, color: '#3d3450' }}>
            {modules.map((m) => (
              <li key={m.id}>
                {m.title}
                {m.duration ? <span style={{ color: '#9b87b5' }}> · {m.duration}</span> : null}
              </li>
            ))}
          </ol>
        </div>
      )}
      {outcomes.length > 0 && (
        <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
          {outcomes.map((o, i) => (
            <li key={i} className="d-flex gap-2" style={{ fontSize: 13, color: '#3d3450' }}>
              <Check size={14} className="flex-shrink-0 mt-1" />
              <span>{o}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div
      ref={cardRef}
      className="course-grid-card h-100 d-flex flex-column"
      onMouseEnter={showPopup}
      onMouseLeave={scheduleClose}
    >
      <div className="course-grid-cover position-relative">
        {course.coverImage ? (
          <img src={`${API_ORIGIN}/courses/covers/${course.coverImage}`} alt="" />
        ) : (
          <div className="course-grid-cover-empty">
            <ImageOff size={28} color="#fff" style={{ opacity: 0.6 }} />
          </div>
        )}
        <span className={`course-grid-status ${course.status === 'Active' ? 'is-active' : 'is-inactive'}`}>
          <span className="dot" />
          {course.status}
        </span>
      </div>
      <div className="p-3 d-flex flex-column flex-grow-1">
        <span className="course-grid-category align-self-start mb-2">{course.category}</span>
        <div className="course-grid-title mb-1" title={course.name}>
          {course.name}
        </div>
        <div className="small mb-3" style={{ color: '#9b87b5' }}>
          {course.code}
        </div>
        <div className="course-grid-stats mb-3">
          <span title="Modules">
            <Layers size={14} /> {modules.length}
          </span>
          {questionCount > 0 && (
            <span title="Quiz questions">
              <HelpCircle size={14} /> {questionCount}
            </span>
          )}
          {course.durationHours != null && (
            <span title="Duration">
              <Clock size={14} /> {course.durationHours}h
            </span>
          )}
          {questionCount > 0 && (
            <span title="Pass score">
              <Award size={14} /> {course.passScore}%
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2 mt-auto pt-3" style={{ borderTop: '1px solid #ede8f5' }}>
          <IconButton icon={<Pencil size={14} />} onClick={onEdit} title="Edit course" tone="blue" />
          <IconButton
            icon={course.status === 'Active' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
            onClick={onToggleStatus}
            title={course.status === 'Active' ? 'Deactivate' : 'Activate'}
            tone={course.status === 'Active' ? 'amber' : 'green'}
          />
          <IconButton icon={<Eye size={14} />} onClick={onPreview} title="Full preview" tone="purple" />
        </div>
      </div>
      {popup &&
        createPortal(
          <div
            className="course-hover-popup scrollbar-thin"
            style={{ top: popup.top, left: popup.left, width: POPUP_W, maxHeight: popup.maxHeight }}
            onMouseEnter={keepOpen}
            onMouseLeave={scheduleClose}
          >
            {details}
          </div>,
          document.body,
        )}
    </div>
  )
}

export function CoursesTab() {
  const { courses, courseOptions, courseModules, quizQuestions, certificateTemplates, addCourse, updateCourse } = useData()
  useDataNeeds('courseOptions')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>('All')
  const [layerFilter, setLayerFilter] = useState<CategoryType | 'All layers'>('All layers')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Course | undefined>(undefined)
  const [previewing, setPreviewing] = useState<Course | undefined>(undefined)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<CategoryType>>(new Set())
  // On first load every category starts collapsed.
  const collapsedInit = useRef(false)
  useEffect(() => {
    const types = courseOptions.categoryTypes
    if (collapsedInit.current || !types.length) return
    collapsedInit.current = true
    setCollapsedTypes(new Set(types))
  }, [courseOptions.categoryTypes])
  const toggleCollapsed = (type: CategoryType) =>
    setCollapsedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<number>>(new Set())
  const toggleExpanded = (id: number) =>
    setExpandedCourseIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const filtered = useMemo(
    () =>
      courses.filter((c) => {
        const matchesQuery = c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase())
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter
        return matchesQuery && matchesStatus
      }),
    [courses, query, statusFilter],
  )

  const groupTypes = layerFilter === 'All layers' ? courseOptions.categoryTypes : [layerFilter]

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }
  const openEdit = (course: Course) => {
    setEditing(course)
    setModalOpen(true)
  }
  const handleSave = (data: Partial<CourseInput>) => (editing ? updateCourse(editing.id, data) : addCourse(data as CourseInput))
  const toggleStatus = (course: Course) =>
    updateCourse(course.id, {
      status: course.status === 'Active' ? 'Inactive' : 'Active',
    })
  const confirmToggle = (course: Course) => {
    const deactivating = course.status === 'Active'
    confirmDialog({
      title: deactivating ? 'Deactivate course?' : 'Activate course?',
      content: `Are you sure you want to ${deactivating ? 'deactivate' : 'activate'} ${course.name}?`,
      okText: deactivating ? 'Deactivate Course' : 'Activate Course',
      okButtonProps: { danger: deactivating },
      onOk: () => toggleStatus(course),
    })
  }

  return (
    <div className="d-flex flex-column h-100">
      <div className="row row-cols-2 row-cols-lg-3 g-3 mb-4 flex-shrink-0">
        <div className="col">
          <StatCard icon={<BookOpen size={20} />} label="Total Courses" value={courses.length} tone="purple" />
        </div>
        <div className="col">
          <StatCard icon={<CheckCircle2 size={20} />} label="Active" value={courses.filter((c) => c.status === 'Active').length} tone="green" />
        </div>
        <div className="col">
          <StatCard icon={<Ban size={20} />} label="Inactive" value={courses.filter((c) => c.status === 'Inactive').length} tone="slate" />
        </div>
      </div>

      <ListCard className="mb-4 flex-shrink-0">
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Title or course code"
          filters={statusFilters}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          newLabel="New Course"
          onNew={openCreate}
          extra={
            <div className="d-flex gap-2">
              <Select
                value={layerFilter}
                onChange={setLayerFilter}
                options={[{ value: 'All layers', label: 'All layers' }, ...courseOptions.categoryTypes.map((t) => ({ value: t, label: t }))]}
                style={{ width: 180 }}
              />
              <div className="d-flex align-items-center gap-1 rounded-2" style={{ border: '1px solid #ede8f5', padding: 2 }}>
                <button
                  type="button"
                  title="List view"
                  aria-label="List view"
                  onClick={() => setView('list')}
                  className="d-flex align-items-center justify-content-center border-0 rounded-2"
                  style={{
                    width: 28,
                    height: 28,
                    background: view === 'list' ? '#f1e9fb' : 'transparent',
                    color: view === 'list' ? '#5c2d91' : '#9b87b5',
                  }}
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  title="Grid view"
                  aria-label="Grid view"
                  onClick={() => setView('grid')}
                  className="d-flex align-items-center justify-content-center border-0 rounded-2"
                  style={{
                    width: 28,
                    height: 28,
                    background: view === 'grid' ? '#f1e9fb' : 'transparent',
                    color: view === 'grid' ? '#5c2d91' : '#9b87b5',
                  }}
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          }
        />
      </ListCard>

      <div className="flex-grow-1" style={{ minHeight: 0 }}>
        <div className="course-scroll-area d-flex flex-column gap-3 h-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {groupTypes.map((type) => {
            const groupCourses = filtered.filter((c) => c.category === type)
            const collapsed = collapsedTypes.has(type)
            const gs = GROUP_STYLE[type] ?? DEFAULT_GROUP_STYLE
            return (
              <div key={type} className="course-group flex-shrink-0" style={{ ['--accent' as string]: gs.color, ['--accent-bg' as string]: gs.bg }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCollapsed(type)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCollapsed(type) }}
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
                      {groupCourses.length} course{groupCourses.length === 1 ? '' : 's'}
                    </span>
                    <span className="course-group-chevron">
                      {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </div>
                </div>
                {collapsed ? null : groupCourses.length === 0 ? (
                  <p className="small mb-0 p-3" style={{ color: '#9b87b5' }}>
                    No courses match your filters in this layer.
                  </p>
                ) : view === 'grid' ? (
                  <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-3 p-3">
                    {groupCourses.map((c) => (
                      <div key={c.id} className="col">
                        <CourseGridCard
                          course={c}
                          modules={courseModules.filter((m) => m.courseId === c.id).sort((a, b) => a.order - b.order)}
                          questionCount={quizQuestions.filter((q) => q.courseId === c.id).length}
                          onEdit={() => openEdit(c)}
                          onToggleStatus={() => confirmToggle(c)}
                          onPreview={() => setPreviewing(c)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="d-flex flex-column px-2 pb-2">
                    {groupCourses.map((c, i) => {
                      const courseExpanded = expandedCourseIds.has(c.id)
                      const modules = courseModules.filter((m) => m.courseId === c.id).sort((a, b) => a.order - b.order)
                      const questions = quizQuestions.filter((q) => q.courseId === c.id)
                      const template = certificateTemplates.find((t) => t.name === c.certificateTemplate)
                      return (
                        <div key={c.id} className="course-row-wrap" style={{ borderTop: i > 0 ? '1px solid #f1edf8' : undefined }}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleExpanded(c.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpanded(c.id) }}
                            className="course-row d-flex align-items-center gap-3 py-2 px-3 rounded-3"
                          >
                            {courseExpanded ? <ChevronDown size={14} color="#9b87b5" /> : <ChevronRight size={14} color="#9b87b5" />}
                            <CoverThumb cover={c.coverImage} />
                            <div className="flex-grow-1 min-w-0">
                              <div className="course-row-title text-truncate">
                                {c.name}
                              </div>
                              <div className="course-row-code text-truncate">
                                {c.code}
                              </div>
                            </div>
                            <span className={`course-status-pill ${c.status === 'Active' ? 'is-active' : 'is-inactive'}`}>
                              <span className="dot" />
                              {c.status}
                            </span>
                            <div className="d-flex align-items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(c)} title="Edit course" tone="blue" />
                              <IconButton
                                icon={c.status === 'Active' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                                onClick={() => confirmToggle(c)}
                                title={c.status === 'Active' ? 'Deactivate' : 'Activate'}
                                tone={c.status === 'Active' ? 'amber' : 'green'}
                              />
                              <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(c)} title="Full preview" tone="purple" />
                            </div>
                          </div>

                          {courseExpanded && (
                            <div className="course-row-detail d-flex flex-column gap-3">
                              {c.description && (
                                <p className="small mb-0" style={{ color: '#7b6b94' }}>
                                  {c.description}
                                </p>
                              )}

                              <div>
                                <div className="small fw-semibold d-flex align-items-center gap-2 mb-2" style={{ color: '#1a1228' }}>
                                  <Layers size={14} /> Modules ({modules.length})
                                </div>
                                {modules.length === 0 ? (
                                  <p className="small mb-0" style={{ color: '#9b87b5' }}>
                                    No modules added yet.
                                  </p>
                                ) : (
                                  <div className="d-flex flex-column gap-1">
                                    {modules.map((m) => (
                                      <div key={m.id} className="d-flex align-items-center gap-2 small">
                                        <Badge tone="slate">{m.order}</Badge>
                                        <span style={{ color: '#3d3352' }}>{m.title}</span>
                                        <Badge tone="purple">{m.type === 'scorm' ? 'SCORM' : m.type}</Badge>
                                        {m.duration && <span style={{ color: '#9b87b5' }}>{m.duration}</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="small d-flex align-items-center gap-2" style={{ color: '#1a1228' }}>
                                <HelpCircle size={14} />
                                <span className="fw-semibold">Quiz:</span>
                                <span style={{ color: '#7b6b94' }}>
                                  {questions.length} question{questions.length === 1 ? '' : 's'}
                                </span>
                              </div>

                              <div className="small d-flex align-items-center gap-2" style={{ color: '#1a1228' }}>
                                <Award size={14} />
                                <span className="fw-semibold">Certificate:</span>
                                <span style={{ color: '#7b6b94' }}>{template ? template.name : c.certificateTemplate || 'None'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {modalOpen && <ManualCourseModal course={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
      {previewing && <CoursePreviewModal course={previewing} onClose={() => setPreviewing(undefined)} />}
    </div>
  )
}
