import { useMemo, useState } from 'react'
import { BookOpen, Gift, Tag, Pencil, Eye } from 'lucide-react'
import { Select } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { ListCard } from '../components/ui/ListCard'
import { DataTable } from '../components/ui/DataTable'
import { Toolbar } from '../components/ui/Toolbar'
import { IconButton } from '../components/ui/IconButton'
import { CourseFormModal } from '../components/courses/CourseFormModal'
import { CoursePreviewModal } from '../components/lms-content/CoursePreviewModal'
import { useData, useDataNeeds } from '../context/DataContext'
import type { CategoryType, Course, CourseInput } from '../api'

export default function Courses() {
  const { courses, courseOptions, addCourse, updateCourse } = useData()
  useDataNeeds('courses', 'courseOptions', 'certificateTemplates', 'courseModules', 'quizQuestions')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryType | 'All'>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Course | undefined>(undefined)
  const [previewing, setPreviewing] = useState<Course | null>(null)

  const categoryOptions = useMemo(
    () => [{ value: 'All' as const, label: 'All' }, ...courseOptions.categoryTypes.map((c) => ({ value: c, label: c }))],
    [courseOptions.categoryTypes],
  )

  const rows = useMemo(
    () =>
      courses.filter((c) => {
        const matchesQuery = c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase())
        const matchesCategory = category === 'All' || c.category === category
        return matchesQuery && matchesCategory
      }),
    [courses, query, category],
  )

  const freeCount = courses.filter((c) => c.type === 'Free').length
  const paidCount = courses.filter((c) => c.type === 'Paid').length

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (course: Course) => {
    setEditing(course)
    setModalOpen(true)
  }

  // Code and (if left blank) the LMS mapping are assigned by the server.
  const handleSave = (data: CourseInput) => (editing ? updateCourse(editing.id, data) : addCourse(data))

  return (
    <AppLayout title="Course Catalog" subtitle="Manage the course catalog and pricing">
      <div className="row row-cols-1 row-cols-sm-3 g-3">
        <div className="col">
          <StatCard icon={<BookOpen size={20} />} label="Total Courses" value={courses.length} tone="purple" />
        </div>
        <div className="col">
          <StatCard icon={<Gift size={20} />} label="Free Courses" value={freeCount} tone="green" />
        </div>
        <div className="col">
          <StatCard icon={<Tag size={20} />} label="Paid Courses" value={paidCount} tone="blue" />
        </div>
      </div>

      <ListCard className="mt-4">
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search courses..."
          newLabel="Add Course"
          onNew={openCreate}
          extra={<Select value={category} onChange={setCategory} options={categoryOptions} style={{ minWidth: 150 }} />}
        />
        <DataTable<Course>
          rowKey="id"
          dataSource={rows}
          locale={{ emptyText: 'No courses match your search.' }}
          columns={[
            { title: 'ID', width: 120, dataIndex: 'code', render: (code: string) => <span className="tenant-muted">{code}</span> },
            {
              title: 'Course Name',
              dataIndex: 'name',
              render: (name: string, c) => (
                <>
                  <span className="tenant-name">{name}</span>
                  {c.scormPackage && (
                    <span
                      title={`SCORM ${c.scormVersion ?? ''} · ${c.launchFile ?? ''}`}
                      className="ms-2 rounded px-2 py-1 align-middle fw-bold text-uppercase"
                      style={{ fontSize: 10, background: '#f0e8fa', color: '#5c2d91' }}
                    >
                      SCORM
                    </span>
                  )}
                </>
              ),
            },
            { title: 'Category', width: 190, dataIndex: 'category' },
            { title: 'Price', width: 110, dataIndex: 'price', render: (price: number) => (price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Free') },
            { title: 'Type', width: 110, dataIndex: 'type', render: (type: Course['type']) => <Badge tone={type === 'Free' ? 'green' : 'blue'}>{type}</Badge> },
            { title: 'Status', width: 130, dataIndex: 'status', render: (status: Course['status']) => <Badge>{status}</Badge> },
            {
              title: 'Actions', width: 160,
              key: 'actions',
              render: (_: unknown, c) => (
                <div className="d-flex align-items-center gap-2">
                  <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(c)} title="Preview course" tone="purple" />
                  <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(c)} title="Edit course" tone="blue" />
                </div>
              ),
            },
          ]}
        />
      </ListCard>

      {modalOpen && <CourseFormModal course={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
      {previewing && <CoursePreviewModal course={previewing} onClose={() => setPreviewing(null)} />}
    </AppLayout>
  )
}
