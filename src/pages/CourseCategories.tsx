import { useEffect, useMemo, useState } from 'react'
import { Ban, CheckCircle2, Pencil, Plus } from 'lucide-react'
import { Button } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { IconButton } from '../components/ui/IconButton'
import { ErrorBlock, LoadingBlock, Notice } from '../components/ui/State'
import { CategoryFormModal } from '../components/courses/CategoryFormModal'
import { useData, useDataNeeds } from '../context/DataContext'
import { api, errorMessage, type CategoryBrowseGroup, type CourseCategory } from '../api'

function slug(type: string) {
  return `group-${type.toLowerCase().replace(/[^a-z]+/g, '-')}`
}

// "B2" sorts before "B10": split the leading letters from the trailing number and compare the number
// numerically, not as text (where "10" < "2" lexicographically). Mirrors the backend's own sort.
function codeSortKey(code: string | null): [string, number, string] {
  if (!code) return ['', 0, '']
  const m = /^([A-Za-z]*)(\d*)$/.exec(code)
  const letters = m?.[1] ?? code
  const digits = m?.[2] ?? ''
  return [letters, digits ? Number(digits) : 0, code]
}

function CourseCount({ total, active }: { total: number; active: number }) {
  if (total === 0) return <span className="small" style={{ color: '#9b87b5' }}>0 Capability Courses</span>
  if (active === total) return <span className="small" style={{ color: '#7b6b94' }}>{total} Capability Courses</span>
  return (
    <span className="small" style={{ color: '#7b6b94' }}>
      {active} of {total} Capability Courses
    </span>
  )
}

export default function CourseCategories() {
  const { courseOptions, courseCategories, courses, addCourseCategory, updateCourseCategory } = useData()
  useDataNeeds('courseOptions', 'courseCategories', 'courses')

  // Courses are tagged with just the broad type (Course.category), not a specific row here, so course
  // counts only make sense per type/group - that's what the browse endpoint returns at the group level.
  // Everything else about a row (name, code, description, status) comes from the editable `courseCategories`
  // list so Inactive rows still show here for management.
  const [browseGroups, setBrowseGroups] = useState<CategoryBrowseGroup[] | null>(null)
  const [browseError, setBrowseError] = useState('')
  const loadBrowse = () => {
    setBrowseError('')
    api
      .courseCategoriesBrowse()
      .then(setBrowseGroups)
      .catch((e) => setBrowseError(errorMessage(e)))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadBrowse, [])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CourseCategory | undefined>(undefined)
  const [actionError, setActionError] = useState('')

  const groups = useMemo(() => {
    const byType = new Map((browseGroups ?? []).map((g) => [g.type, g]))
    return courseOptions.categoryTypes.map((type) => {
      const g = byType.get(type)
      return {
        type,
        description: g?.description ?? '',
        totalCourses: g?.totalCourses ?? 0,
        activeCourses: g?.activeCourses ?? 0,
        categories: courseCategories
          .filter((c) => c.type === type)
          .sort((a, b) => {
            const [al, an, ac] = codeSortKey(a.code)
            const [bl, bn, bc] = codeSortKey(b.code)
            return al !== bl ? al.localeCompare(bl) : an !== bn ? an - bn : ac.localeCompare(bc)
          }),
        courses: courses.filter((c) => c.category === type),
      }
    })
  }, [courseOptions.categoryTypes, browseGroups, courseCategories, courses])

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }
  const openEdit = (category: CourseCategory) => {
    setEditing(category)
    setModalOpen(true)
  }
  const handleSave = (data: Parameters<typeof addCourseCategory>[0]) =>
    editing ? updateCourseCategory(editing.id, data) : addCourseCategory(data)
  const toggleStatus = async (category: CourseCategory) => {
    setActionError('')
    try {
      await updateCourseCategory(category.id, { status: category.status === 'Active' ? 'Inactive' : 'Active' })
    } catch (e) {
      setActionError(`${category.name}: ${errorMessage(e)}`)
    }
  }

  return (
    <AppLayout title="Course Categories" subtitle="Browse and manage the capability framework every course is tagged against">
      {browseError ? (
        <ErrorBlock message={browseError} onRetry={loadBrowse} />
      ) : !browseGroups ? (
        <LoadingBlock />
      ) : (
        <div className="d-flex flex-column h-100">
          <div className="d-flex justify-content-end mb-3 flex-shrink-0">
            <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
              New Category
            </Button>
          </div>
          {actionError && (
            <div className="mb-3 flex-shrink-0">
              <Notice tone="error" onDismiss={() => setActionError('')}>
                {actionError}
              </Notice>
            </div>
          )}
          <div className="row g-4 flex-grow-1" style={{ minHeight: 0 }}>
            <div className="col-12 col-lg-3">
              <Card className="p-3 h-100">
                <div className="d-flex flex-column gap-4 h-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
                  {groups.map((group) => (
                    <div key={group.type}>
                      <p className="mb-2 fw-bold text-uppercase" style={{ fontSize: 11, letterSpacing: '.04em', color: '#9b87b5' }}>
                        {group.type}
                      </p>
                      <div className="d-flex flex-column gap-1">
                        {group.courses.length === 0 ? (
                          <span className="small" style={{ color: '#c3b8d6' }}>No courses yet</span>
                        ) : (
                          group.courses.map((c) => (
                            <a
                              key={c.id}
                              href={`#${slug(group.type)}`}
                              className="small text-truncate"
                              style={{ color: c.status === 'Active' ? '#4a3763' : '#c3b8d6', textDecoration: 'none' }}
                            >
                              {c.name}
                            </a>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="col-12 col-lg-9">
              <div className="d-flex flex-column gap-4 h-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
                {groups.map((group) => (
                  <Card key={group.type} className="p-4">
                    <div id={slug(group.type)} style={{ scrollMarginTop: 16 }} />
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h3 className="mb-0 fw-bold" style={{ color: '#1a1228' }}>
                        {group.type}
                      </h3>
                      <CourseCount total={group.totalCourses} active={group.activeCourses} />
                    </div>
                    <p className="mb-3" style={{ color: '#7b6b94' }}>
                      {group.description}
                    </p>
                    <hr style={{ borderColor: '#ede8f5' }} />
                    {group.categories.length === 0 ? (
                      <p className="small mb-0 mt-3" style={{ color: '#9b87b5' }}>
                        No categories under this type yet.
                      </p>
                    ) : (
                      <div className="d-flex flex-column">
                        {group.categories.map((c, i) => (
                          <div
                            key={c.id}
                            className="d-flex align-items-start gap-3 py-3"
                            style={{ borderTop: i > 0 ? '1px solid #ede8f5' : undefined, opacity: c.status === 'Active' ? 1 : 0.55 }}
                          >
                            {c.code && (
                              <span className="small fw-semibold pt-1" style={{ color: '#9b87b5', minWidth: 32 }}>
                                {c.code}
                              </span>
                            )}
                            <div className="flex-grow-1 min-w-0">
                              <div className="fw-bold" style={{ color: '#5c2d91', fontSize: 15 }}>
                                {c.name}
                              </div>
                              {c.description && (
                                <div className="small mt-1" style={{ color: '#7b6b94' }}>
                                  {c.description}
                                </div>
                              )}
                            </div>
                            {c.status === 'Inactive' && <Badge>Inactive</Badge>}
                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                              <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(c)} title="Edit category" tone="blue" />
                              <IconButton
                                icon={c.status === 'Active' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                                onClick={() => void toggleStatus(c)}
                                title={c.status === 'Active' ? 'Deactivate' : 'Activate'}
                                tone={c.status === 'Active' ? 'amber' : 'green'}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <CategoryFormModal
          category={editing}
          onClose={() => setModalOpen(false)}
          onSave={async (data) => {
            await handleSave(data)
            loadBrowse()
          }}
        />
      )}
    </AppLayout>
  )
}
