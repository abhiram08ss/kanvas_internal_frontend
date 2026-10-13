import { useMemo, useState } from 'react'
import { confirmDialog } from '../ui/confirmOptions'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { ListCard } from '../ui/ListCard'
import { DataTable } from '../ui/DataTable'
import { Toolbar } from '../ui/Toolbar'
import { IconButton } from '../ui/IconButton'
import { CoursePicker } from './CoursePicker'
import { ModuleFormModal } from './ModuleFormModal'
import { ScormPreviewModal } from '../courses/ScormPreviewModal'
import { ModulePreviewModal } from './ModulePreviewModal'
import { useData } from '../../context/DataContext'
import { errorMessage, type CourseModule } from '../../api'

const typeTone: Record<CourseModule['type'], 'purple' | 'blue' | 'slate' | 'green' | 'amber' | 'red'> = {
  hybrid: 'purple',
  text: 'blue',
  document: 'slate',
  image: 'green',
  video: 'amber',
  scorm: 'red',
}
const statusFilters = ['All', 'Active', 'Inactive'] as const

export function ModulesTab({ selectedCourseId, onSelectCourse }: { selectedCourseId: number | null; onSelectCourse: (id: number) => void }) {
  const { editableCourses, courseModules, addCourseModule, updateCourseModule, deleteCourseModule } = useData()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CourseModule | undefined>(undefined)
  const [previewing, setPreviewing] = useState<CourseModule | null>(null)
  const [error, setError] = useState('')

  const selectedCourse = editableCourses.find((c) => c.id === selectedCourseId)
  const scoped = selectedCourseId ? courseModules.filter((m) => m.courseId === selectedCourseId) : courseModules
  const rows = useMemo(
    () =>
      [...scoped.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || m.status === filter))].sort(
        (a, b) => a.order - b.order || a.title.localeCompare(b.title),
      ),
    [scoped, query, filter],
  )
  const nextOrder = scoped.length > 0 ? Math.max(...scoped.map((m) => m.order)) + 1 : 1

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }
  const openEdit = (m: CourseModule) => {
    setEditing(m)
    setModalOpen(true)
  }
  const handleSave = (data: Parameters<typeof addCourseModule>[0]) => (editing ? updateCourseModule(editing.id, data) : addCourseModule(data))
  const handleDelete = (m: CourseModule) =>
    confirmDialog({
      title: 'Delete module?',
      content: `Are you sure you want to delete ${m.title}?`,
      okText: 'Delete Module',
      okButtonProps: { danger: true },
      onOk: async () => {
        setError('')
        try {
          await deleteCourseModule(m.id)
        } catch (e) {
          setError(errorMessage(e))
        }
      },
    })

  return (
    <div className="d-flex gap-3" style={{ height: 'calc(100vh - 210px)', minHeight: 320 }}>
      <CoursePicker courses={editableCourses} selectedId={selectedCourseId} onSelect={onSelectCourse} />

      <div className="flex-grow-1" style={{ minWidth: 0, overflowY: 'auto' }}>
        <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
          {selectedCourse && (
            <>
              <span className="d-inline-flex align-items-center px-3 rounded-pill fw-semibold" style={{ height: 30, fontSize: 13, lineHeight: 1, background: '#f3effb', color: '#6b3fa0', border: '1px solid #e4d9f5' }}>
                {selectedCourse.category}
              </span>
              <span style={{ color: '#a8a3b3' }}>›</span>
            </>
          )}
          <span className="d-inline-flex align-items-center px-3 rounded-pill fw-semibold" style={{ height: 30, fontSize: 13, lineHeight: 1, background: '#fff', color: '#1f1b2d', border: '1px solid #e2e0ea' }}>
            {selectedCourse ? selectedCourse.name : 'All courses'}
          </span>
          <span style={{ color: '#a8a3b3' }}>·</span>
          <span className="d-inline-flex align-items-center px-3 rounded-pill fw-semibold" style={{ height: 30, fontSize: 13, lineHeight: 1, background: '#eef2f7', color: '#475569', border: '1px solid #e2e8f0' }}>
            {scoped.length} {scoped.length === 1 ? 'module' : 'modules'}
          </span>
        </div>

        {error && <p className="small text-danger">{error}</p>}

        <ListCard>
          <Toolbar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search modules..."
            filters={statusFilters}
            activeFilter={filter}
            onFilterChange={setFilter}
            newLabel="New Module"
            onNew={openCreate}
          />
          <DataTable<CourseModule>
            serial={false}
            rowKey="id"
            dataSource={rows}
            locale={{ emptyText: 'No modules yet for this course.' }}
            columns={[
              { title: 'Title', dataIndex: 'title', render: (title: string) => <span>{title}</span> },
              { title: 'Type', width: 120, dataIndex: 'type', render: (type: CourseModule['type']) => <Badge tone={typeTone[type]}>{type}</Badge> },
              { title: 'Duration', width: 120, dataIndex: 'duration', render: (d: string | null) => <span className="tenant-muted">{d ?? '—'}</span> },
              { title: 'Status', width: 130, dataIndex: 'status', render: (status: CourseModule['status']) => <Badge>{status}</Badge> },
              {
                title: 'Actions', width: 140,
                key: 'actions',
                render: (_: unknown, m: CourseModule) => (
                  <div className="d-flex align-items-center gap-2">
                    <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(m)} title="Edit module" tone="blue" />
                    <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(m)} title={m.type === 'scorm' ? 'Preview SCORM' : 'View module'} tone="purple" disabled={m.type === 'scorm' && !m.scormPackage} />
                    <IconButton icon={<Trash2 size={14} />} onClick={() => void handleDelete(m)} title="Delete module" tone="red" />
                  </div>
                ),
              },
            ]}
          />
        </ListCard>
      </div>

      {modalOpen && (
        <ModuleFormModal
          module={editing}
          courses={editableCourses}
          defaultCourseId={selectedCourseId ?? editableCourses[0]?.id ?? 0}
          nextOrder={nextOrder}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {previewing && previewing.type !== 'scorm' && <ModulePreviewModal module={previewing} onClose={() => setPreviewing(null)} />}
      {previewing && previewing.type === 'scorm' && (
        <ScormPreviewModal
          course={{
            scormPackage: previewing.scormPackage,
            name: previewing.title,
            scormTitle: previewing.scormTitle,
            launchFile: previewing.launchFile,
          }}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  )
}
