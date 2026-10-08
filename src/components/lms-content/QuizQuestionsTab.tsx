import { useMemo, useState } from 'react'
import { Plus, Trash2, CheckCircle2, Pencil } from 'lucide-react'
import { ListCard } from '../ui/ListCard'
import { Badge } from '../ui/Badge'
import { Toolbar } from '../ui/Toolbar'
import { IconButton } from '../ui/IconButton'
import { CoursePicker } from './CoursePicker'
import { QuizQuestionFormModal } from './QuizQuestionFormModal'
import { useData } from '../../context/DataContext'
import { errorMessage, type QuizQuestion } from '../../api'

export function QuizQuestionsTab({ selectedCourseId, onSelectCourse }: { selectedCourseId: number | null; onSelectCourse: (id: number) => void }) {
  const { editableCourses, quizQuestions, addQuizQuestion, updateQuizQuestion, deleteQuizQuestion } = useData()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QuizQuestion | undefined>(undefined)
  const [error, setError] = useState('')

  const scoped = selectedCourseId ? quizQuestions.filter((q) => q.courseId === selectedCourseId) : quizQuestions
  const rows = useMemo(() => scoped.filter((q) => q.text.toLowerCase().includes(query.toLowerCase())), [scoped, query])

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }
  const openEdit = (q: QuizQuestion) => {
    setEditing(q)
    setModalOpen(true)
  }
  const handleSave = (data: Parameters<typeof addQuizQuestion>[0]) => (editing ? updateQuizQuestion(editing.id, data) : addQuizQuestion(data))
  const handleDelete = async (q: QuizQuestion) => {
    if (!window.confirm('Delete this question? This cannot be undone.')) return
    setError('')
    try {
      await deleteQuizQuestion(q.id)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="d-flex gap-3 align-items-start">
      <CoursePicker courses={editableCourses} selectedId={selectedCourseId} onSelect={onSelectCourse} />

      <div className="flex-grow-1">
        <p className="mb-2 fw-bold text-dark">All Questions ({rows.length} records)</p>

        {error && <p className="small text-danger">{error}</p>}

        <ListCard>
          <Toolbar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search questions..."
            newLabel="Create Question"
            onNew={openCreate}
            newIcon={<Plus size={14} />}
          />

          <div className="d-flex flex-column p-3 gap-3">
            {rows.map((q) => (
              <div key={q.id} className="rounded-3 p-3" style={{ border: '1.5px solid #ede8f5', background: '#fdfcff' }}>
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <Badge tone="green">{q.type}</Badge>
                    <Badge tone="purple">{q.category}</Badge>
                    <Badge tone="slate">{q.course}</Badge>
                  </div>
                  <div className="d-flex flex-shrink-0 align-items-center gap-2">
                    <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(q)} title="Edit question" tone="blue" />
                    <IconButton icon={<Trash2 size={14} />} onClick={() => void handleDelete(q)} title="Delete question" tone="red" />
                  </div>
                </div>

                <p className="mt-3 mb-2 fw-semibold" style={{ color: '#1a1228' }}>
                  {q.text}
                </p>
                <div className="d-flex flex-column gap-1">
                  {q.options.map((opt, i) => (
                    <div key={i} className="d-flex align-items-center gap-2 small" style={{ color: '#7b6b94' }}>
                      {opt}
                      {i === q.correctIndex && <CheckCircle2 size={14} className="text-success" />}
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
