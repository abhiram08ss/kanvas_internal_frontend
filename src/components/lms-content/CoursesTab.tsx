import { useMemo, useState } from 'react'
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
} from 'lucide-react'
import { Select } from 'antd'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { ListCard } from '../ui/ListCard'
import { StatCard } from '../ui/StatCard'
import { Toolbar } from '../ui/Toolbar'
import { IconButton } from '../ui/IconButton'
import { ManualCourseModal } from '../courses/ManualCourseModal'
import { CoursePreviewModal } from './CoursePreviewModal'
import { useData, useDataNeeds } from '../../context/DataContext'
import { API_ORIGIN, type CategoryType, type Course, type CourseInput } from '../../api'

const statusFilters = ['All', 'Active', 'Inactive'] as const

function CoverThumb({ cover }: { cover: string | null }) {
  if (cover) {
    return <img src={`${API_ORIGIN}/courses/covers/${cover}`} alt="" className="rounded-2 border flex-shrink-0" style={{ width: 40, height: 40, objectFit: 'cover' }} />
  }
  return (
    <div
      className="d-inline-flex align-items-center justify-content-center rounded-2 border bg-light text-secondary flex-shrink-0"
      style={{ width: 40, height: 40 }}
    >
      <ImageOff size={14} />
    </div>
  )
}

function CourseGridCard({
  course,
  onEdit,
  onToggleStatus,
  onPreview,
}: {
  course: Course
  onEdit: () => void
  onToggleStatus: () => void
  onPreview: () => void
}) {
  return (
    <div className="rounded-3 overflow-hidden h-100 d-flex flex-column" style={{ border: '1.5px solid #ede8f5', background: '#fff' }}>
      {course.coverImage ? (
        <img
          src={`${API_ORIGIN}/courses/covers/${course.coverImage}`}
          alt=""
          style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div className="d-flex align-items-center justify-content-center" style={{ height: 130, background: 'linear-gradient(135deg, #5c2d91, #7b3fa0)' }}>
          <ImageOff size={28} color="#fff" style={{ opacity: 0.5 }} />
        </div>
      )}
      <div className="p-3 d-flex flex-column flex-grow-1">
        <div className="d-flex align-items-center gap-2 mb-2">
          <Badge tone="purple">{course.category}</Badge>
          <Badge>{course.status}</Badge>
        </div>
        <div className="fw-semibold mb-1" style={{ color: '#1a1228' }}>
          {course.name}
        </div>
        <div className="small mb-3" style={{ color: '#9b87b5' }}>
          {course.code}
        </div>
        <div className="d-flex align-items-center gap-2 mt-auto pt-2" style={{ borderTop: '1px solid #ede8f5' }}>
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
        <div className="d-flex flex-column gap-3 h-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {groupTypes.map((type) => {
            const groupCourses = filtered.filter((c) => c.category === type)
            const collapsed = collapsedTypes.has(type)
            return (
              <Card key={type} className="p-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCollapsed(type)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCollapsed(type) }}
                  className="d-flex align-items-center justify-content-between mb-2"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    {collapsed ? <ChevronRight size={16} color="#9b87b5" /> : <ChevronDown size={16} color="#9b87b5" />}
                    <h3 className="mb-0 fw-bold" style={{ color: '#1a1228', fontSize: 16 }}>
                      {type}
                    </h3>
                  </div>
                  <span className="small" style={{ color: '#7b6b94' }}>{groupCourses.length} course{groupCourses.length === 1 ? '' : 's'}</span>
                </div>
                {!collapsed && <hr style={{ borderColor: '#ede8f5' }} />}
                {collapsed ? null : groupCourses.length === 0 ? (
                  <p className="small mb-0 mt-3" style={{ color: '#9b87b5' }}>
                    No courses match your filters in this layer.
                  </p>
                ) : view === 'grid' ? (
                  <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-3">
                    {groupCourses.map((c) => (
                      <div key={c.id} className="col">
                        <CourseGridCard
                          course={c}
                          onEdit={() => openEdit(c)}
                          onToggleStatus={() => void toggleStatus(c)}
                          onPreview={() => setPreviewing(c)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="d-flex flex-column">
                    {groupCourses.map((c, i) => {
                      const courseExpanded = expandedCourseIds.has(c.id)
                      const modules = courseModules.filter((m) => m.courseId === c.id).sort((a, b) => a.order - b.order)
                      const questions = quizQuestions.filter((q) => q.courseId === c.id)
                      const template = certificateTemplates.find((t) => t.name === c.certificateTemplate)
                      return (
                        <div key={c.id} style={{ borderTop: i > 0 ? '1px solid #ede8f5' : undefined }}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleExpanded(c.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpanded(c.id) }}
                            className="d-flex align-items-center gap-3 py-2 px-2 rounded-3"
                            style={{ cursor: 'pointer' }}
                          >
                            {courseExpanded ? <ChevronDown size={14} color="#9b87b5" /> : <ChevronRight size={14} color="#9b87b5" />}
                            <CoverThumb cover={c.coverImage} />
                            <div className="flex-grow-1 min-w-0">
                              <div className="fw-semibold text-truncate" style={{ color: '#1a1228' }}>
                                {c.name}
                              </div>
                              <div className="small text-truncate" style={{ color: '#9b87b5' }}>
                                {c.code}
                              </div>
                            </div>
                            <Badge>{c.status}</Badge>
                            <div className="d-flex align-items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(c)} title="Edit course" tone="blue" />
                              <IconButton
                                icon={c.status === 'Active' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                                onClick={() => void toggleStatus(c)}
                                title={c.status === 'Active' ? 'Deactivate' : 'Activate'}
                                tone={c.status === 'Active' ? 'amber' : 'green'}
                              />
                              <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(c)} title="Full preview" tone="purple" />
                            </div>
                          </div>

                          {courseExpanded && (
                            <div className="ps-4 pb-3 d-flex flex-column gap-3">
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
              </Card>
            )
          })}
        </div>
      </div>

      {modalOpen && <ManualCourseModal course={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
      {previewing && <CoursePreviewModal course={previewing} onClose={() => setPreviewing(undefined)} />}
    </div>
  )
}
