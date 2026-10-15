import { useEffect, useMemo, useState } from 'react'
import { App, Pagination } from 'antd'
import { confirmDialog } from '../ui/confirmOptions'
import { Plus, Trash2, CheckCircle2, Pencil } from 'lucide-react'
import { ListCard } from '../ui/ListCard'
import { Badge } from '../ui/Badge'
import { Toolbar } from '../ui/Toolbar'
import { IconButton } from '../ui/IconButton'
import { CoursePicker } from './CoursePicker'
import { CourseSummary } from './CourseSummary'
import { QuizQuestionFormModal } from './QuizQuestionFormModal'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { errorMessage, type QuizQuestion } from '../../api'

export function QuizQuestionsTab({ selectedCourseId, onSelectCourse }: { selectedCourseId: number | null; onSelectCourse: (id: number) => void }) {
  const { editableCourses, quizQuestions, addQuizQuestion, updateQuizQuestion, deleteQuizQuestion } = useData()
  const { user } = useAuth()
  // Quiz questions are written by a Super Admin; a content user can read them (and see them in a course preview).
  const isSuper = user?.role === 'Super Admin'
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  // Questions per page follow the window height (a card is ~210-240px) so the list fits without scrolling.
  const fitRows = () => window.innerWidth < 992 ? 3 : Math.max(1, Math.floor((window.innerHeight - 210 - 72 - 155) / 210))
  const [PAGE_SIZE, setPageSize] = useState(fitRows)
  useEffect(() => {
    const onResize = () => setPageSize(fitRows())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const [editing, setEditing] = useState<QuizQuestion | undefined>(undefined)
  const [error, setError] = useState('')

  const scoped = selectedCourseId ? quizQuestions.filter((q) => q.courseId === selectedCourseId) : quizQuestions
  const rows = useMemo(() => scoped.filter((q) => q.text.toLowerCase().includes(query.toLowerCase())), [scoped, query])
  const lastPage = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  useEffect(() => setPage(1), [selectedCourseId, query])
  useEffect(() => {
    if (page > lastPage) setPage(lastPage)
  }, [page, lastPage])
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }
  const openEdit = (q: QuizQuestion) => {
    setEditing(q)
    setModalOpen(true)
  }
  const { notification } = App.useApp()
  const handleSave = async (data: Parameters<typeof addQuizQuestion>[0]) => {
    if (editing) await updateQuizQuestion(editing.id, data)
    else await addQuizQuestion(data)
    notification.success({ title: editing ? 'Question Updated' : 'Question Created', description: data.text.slice(0, 80) })
  }
  const handleDelete = (q: QuizQuestion) =>
    confirmDialog({
      title: 'Delete Question?',
      content: 'Are you sure you want to delete this question?',
      okText: 'Delete Question',
      okButtonProps: { danger: true },
      onOk: async () => {
        setError('')
        try {
          await deleteQuizQuestion(q.id)
          notification.success({ title: 'Question Deleted', description: q.text.slice(0, 80) })
        } catch (e) {
          setError(errorMessage(e))
        }
      },
    })

  return (
    <div className="lms-split d-flex gap-3" style={{ height: 'calc(100vh - 210px)', minHeight: 320 }}>
      <CoursePicker courses={editableCourses} selectedId={selectedCourseId} onSelect={onSelectCourse} />

      <div className="lms-split-main flex-grow-1 d-flex flex-column" style={{ minWidth: 0, overflow: 'hidden' }}>
        <CourseSummary course={editableCourses.find((c) => c.id === selectedCourseId)} count={scoped.length} noun="Question" />

        {error && <p className="small text-danger">{error}</p>}

        <ListCard className="fill-height">
          <Toolbar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search questions..."
            newLabel={isSuper ? "Create Question" : undefined}
            onNew={isSuper ? openCreate : undefined}
            newIcon={<Plus size={14} />}
          />

          <div className="d-flex flex-column p-3 gap-3 flex-grow-1 scrollbar-thin" style={{ minHeight: 0, overflowY: 'auto' }}>
            {pageRows.map((q) => (
              <div key={q.id} className="rounded-3 p-3" style={{ border: '1.5px solid #ede8f5', background: '#fdfcff' }}>
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <Badge tone="green">{q.type}</Badge>
                    <Badge tone="purple">{q.category}</Badge>
                    <Badge tone="slate">{q.course}</Badge>
                  </div>
                  {isSuper && (
                    <div className="d-flex flex-shrink-0 align-items-center gap-2">
                      <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(q)} title="Edit question" tone="blue" />
                      <IconButton icon={<Trash2 size={14} />} onClick={() => void handleDelete(q)} title="Delete question" tone="red" />
                    </div>
                  )}
                </div>

                <p className="mt-3 mb-2 fw-semibold" style={{ color: '#1a1228' }}>
                  {q.text}
                </p>
                <div className="d-flex flex-column gap-1">
                  {q.options.map((opt, i) => (
                    <div key={i} className="d-flex align-items-center gap-2 small" style={{ color: '#7b6b94' }}>
                      {opt}
                      {q.correctIndices.includes(i) && <CheckCircle2 size={14} className="text-success" />}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="mt-2 mb-0 small fst-italic" style={{ color: '#9b87b5' }}>
                    {q.explanation}
                  </p>
                )}
                <p className="mt-2 mb-0 text-end small" style={{ color: '#9b87b5' }}>
                  ({q.marks} mk{q.marks === 1 ? '' : 's'})
                </p>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="py-4 text-center small mb-0" style={{ color: '#9b87b5' }}>
                No questions yet for this course.
              </p>
            )}
          </div>
          <div className="ant-table-wrapper tenant-table flex-shrink-0">
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={rows.length}
              onChange={setPage}
              showSizeChanger={false}
              hideOnSinglePage={false}
              size="small"
              showTotal={(total) => `${total} ${total === 1 ? 'item' : 'items'}`}
            />
          </div>
        </ListCard>
      </div>

      {modalOpen && (
        <QuizQuestionFormModal
          question={editing}
          courses={editableCourses}
          defaultCourseId={selectedCourseId ?? editableCourses[0]?.id ?? 0}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
