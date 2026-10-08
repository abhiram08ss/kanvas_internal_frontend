import { useMemo, useState } from 'react'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { ListCard } from '../ui/ListCard'
import { DataTable } from '../ui/DataTable'
import { Toolbar } from '../ui/Toolbar'
import { IconButton } from '../ui/IconButton'
import { CoursePicker } from './CoursePicker'
import { ModuleFormModal } from './ModuleFormModal'
import { ScormPreviewModal } from '../courses/ScormPreviewModal'
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
  const handleDelete = async (m: CourseModule) => {
    if (!window.confirm(`Delete module "${m.title}"? This cannot be undone.`)) return
    setError('')
    try {
      await deleteCourseModule(m.id)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="d-flex gap-3 align-items-start">
      <CoursePicker courses={editableCourses} selectedId={selectedCourseId} onSelect={onSelectCourse} />

      <div className="flex-grow-1">
        <p className="mb-2 fw-bold text-dark">Course Modules ({rows.length} records)</p>

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
            rowKey="id"
            dataSource={rows}
            locale={{ emptyText: 'No modules yet for this course.' }}
            columns={[
              { title: 'Order', dataIndex: 'order', render: (order: number) => <span style={{ color: '#9b87b5' }}>{order}</span> },
              { title: 'Course', dataIndex: 'course' },
              { title: 'Title', dataIndex: 'title', render: (title: string) => <span className="fw-semibold">{title}</span> },
              { title: 'Type', dataIndex: 'type', render: (type: CourseModule['type']) => <Badge tone={typeTone[type]}>{type}</Badge> },
              { title: 'Duration', dataIndex: 'duration', render: (d: string | null) => <span style={{ color: '#9b87b5' }}>{d ?? '—'}</span> },
              { title: 'Status', dataIndex: 'status', render: (status: CourseModule['status']) => <Badge>{status}</Badge> },
              {
                title: 'Actions',
                key: 'actions',
                render: (_: unknown, m: CourseModule) => (
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(m)} title="Edit module" tone="blue" />
                    {m.scormPackage && <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(m)} title="Preview SCORM" tone="purple" />}
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
      {previewing && (
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
