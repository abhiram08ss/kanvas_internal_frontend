import { useState, type FormEvent } from 'react'
import { HelpCircle, Plus, Trash2 } from 'lucide-react'
import { Button, Input, Radio, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { errorMessage, type Course, type QuizQuestion, type QuizQuestionInput, type QuizQuestionType } from '../../api'

const MAX_OPTIONS = 6
const TYPE_OPTIONS: { value: QuizQuestionType; label: string }[] = [
  { value: 'single choice', label: 'Single choice' },
  { value: 'true false', label: 'True false' },
]

export function QuizQuestionFormModal({
  question,
  courses,
  defaultCourseId,
  onClose,
  onSave,
}: {
  question?: QuizQuestion
  courses: Course[]
  defaultCourseId: number
  onClose: () => void
  onSave: (data: QuizQuestionInput) => Promise<void>
}) {
  const [courseId, setCourseId] = useState(question?.courseId ?? defaultCourseId)
  const [type, setType] = useState<QuizQuestionType>(question?.type ?? 'single choice')
  const [category, setCategory] = useState(question?.category ?? 'Final Assessment')
  const [text, setText] = useState(question?.text ?? '')
  const [options, setOptions] = useState<string[]>(question?.type === 'true false' ? ['', ''] : (question?.options ?? ['', '']))
  // Shared between both types: for "true false" it's just 0 (True) or 1 (False).
  const [correctIndex, setCorrectIndex] = useState(question?.correctIndex ?? 0)
  const [marks, setMarks] = useState(String(question?.marks ?? 1))
  const [explanation, setExplanation] = useState(question?.explanation ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateOption = (i: number, value: string) => setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)))
  const addOption = () => setOptions((prev) => [...prev, ''])
  const removeOption = (i: number) => {
    setOptions((prev) => prev.filter((_, idx) => idx !== i))
    if (correctIndex >= i && correctIndex > 0) setCorrectIndex((c) => c - 1)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const isTrueFalse = type === 'true false'
    const trimmed = isTrueFalse ? ['True', 'False'] : options.map((o) => o.trim())
    if (!text.trim() || trimmed.some((o) => !o) || trimmed.length < 2) return
    setSaving(true)
    setError('')
    try {
      await onSave({
        courseId,
        type,
        category: category.trim() || 'Final Assessment',
        text: text.trim(),
        options: trimmed,
        correctIndex,
        marks: Number(marks) || 1,
        explanation: explanation.trim(),
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={question ? 'Edit Question' : 'Create New Question'}
      subtitle="A question for a course quiz"
      onClose={onClose}
      tone="brand"
      icon={<HelpCircle size={20} />}
    >
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}

        <Field label="Course" required>
          <Select value={courseId} onChange={setCourseId} options={courses.map((c) => ({ value: c.id, label: c.name }))} style={{ width: '100%' }} />
        </Field>

        <Field label="Question" required>
          <Input.TextArea value={text} onChange={(e) => setText(e.target.value)} rows={2} required placeholder="Enter question text" />
        </Field>

        <div className="row g-3">
          <div className="col-6">
            <Field label="Type">
              <Select value={type} onChange={setType} options={TYPE_OPTIONS} style={{ width: '100%' }} />
            </Field>
          </div>
          <div className="col-6">
            <Field label="Marks">
              <Input type="number" min={1} value={marks} onChange={(e) => setMarks(e.target.value)} />
            </Field>
          </div>
        </div>

        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Enter category" />
        </Field>

        {type === 'true false' ? (
          <Field label="Correct Answer" required>
            <Radio.Group value={correctIndex} onChange={(e) => setCorrectIndex(e.target.value)}>
              <Radio value={0}>True</Radio>
              <Radio value={1}>False</Radio>
            </Radio.Group>
          </Field>
        ) : (
          <Field label="Options" required hint="Select the radio button next to the correct answer">
            <Radio.Group value={correctIndex} onChange={(e) => setCorrectIndex(e.target.value)} className="w-100">
              <div className="d-flex flex-column gap-2">
                {options.map((opt, i) => (
                  <div key={i} className="d-flex align-items-center gap-2">
                    <Radio value={i} />
                    <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Enter option ${i + 1}`} required />
                    {options.length > 2 && (
                      <Button type="text" danger icon={<Trash2 size={15} />} onClick={() => removeOption(i)} aria-label="Remove option" />
                    )}
                  </div>
                ))}
              </div>
            </Radio.Group>
            {options.length < MAX_OPTIONS && (
              <Button type="link" icon={<Plus size={14} />} onClick={addOption} className="p-0 mt-2">
                Add option
              </Button>
            )}
          </Field>
        )}

        <Field label="Explanation (optional, shown after grading)">
          <Input.TextArea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} placeholder="Enter explanation (optional)" />
        </Field>

        <div className="d-flex justify-content-end gap-3 pt-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {saving ? 'Saving…' : question ? 'Save Changes' : 'Create Question'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
