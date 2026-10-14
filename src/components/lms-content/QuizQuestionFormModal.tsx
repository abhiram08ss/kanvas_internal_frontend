import { useState, type FormEvent } from 'react'
import { HelpCircle, Plus, Trash2 } from 'lucide-react'
import { Button, Checkbox, Input, Radio, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { scrollToFirstError } from '../ui/scrollToError'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { errorMessage, type Course, type QuizQuestion, type QuizQuestionInput, type QuizQuestionType } from '../../api'

const MAX_OPTIONS = 6
const TYPE_OPTIONS: { value: QuizQuestionType; label: string }[] = [
  { value: 'true false', label: 'True false' },
  { value: 'single choice', label: 'Single choice' },
  { value: 'multi choice', label: 'Multi choice' },
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
  // Multi choice: every ticked option is a correct answer.
  const [correctSet, setCorrectSet] = useState<number[]>(question?.type === 'multi choice' ? question.correctIndices : [])
  const toggleCorrect = (i: number) => {
    setCorrectSet((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b)))
    clearError('options')
  }
  const [marks, setMarks] = useState(String(question?.marks ?? 1))
  const [explanation, setExplanation] = useState(question?.explanation ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<{ text?: string; marks?: string; category?: string; explanation?: string; options?: string; optionRows: Record<number, string> }>({ optionRows: {} })
  const clearError = (key: 'text' | 'marks' | 'category' | 'explanation' | 'options') => setErrors((p) => ({ ...p, [key]: undefined }))

  const updateOption = (i: number, value: string) => setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)))
  const addOption = () => setOptions((prev) => [...prev, ''])
  const removeOption = (i: number) => {
    setOptions((prev) => prev.filter((_, idx) => idx !== i))
    if (correctIndex >= i && correctIndex > 0) setCorrectIndex((c) => c - 1)
    setCorrectSet((prev) => prev.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const isTrueFalse = type === 'true false'
    const trimmed = isTrueFalse ? ['True', 'False'] : options.map((o) => o.trim())
    // ---- validate everything and show every problem at once
    const next: typeof errors = { optionRows: {} }
    if (!text.trim()) next.text = 'Question text is required.'
    else if (text.trim().length < 3) next.text = 'Question text must be at least 3 characters.'
    else if (text.trim().length > 1000) next.text = 'Question text must be 1000 characters or fewer.'
    const markValue = Number(marks)
    if (marks.trim() === '' || !Number.isInteger(markValue) || markValue < 1 || markValue > 100) next.marks = 'Marks must be a whole number from 1 to 100.'
    if (category.trim().length > 80) next.category = 'Category must be 80 characters or fewer.'
    if (explanation.trim().length > 1000) next.explanation = 'Explanation must be 1000 characters or fewer.'
    if (!isTrueFalse) {
      if (trimmed.length < 2) next.options = 'Add at least two options.'
      const seen = new Map<string, number>()
      trimmed.forEach((o, i) => {
        if (!o) next.optionRows[i] = `Option ${i + 1} is empty.`
        else if (seen.has(o.toLowerCase())) next.optionRows[i] = `Option ${i + 1} repeats option ${(seen.get(o.toLowerCase()) ?? 0) + 1}.`
        else seen.set(o.toLowerCase(), i)
      })
      if (type === 'multi choice') {
        const ticked = correctSet.filter((i) => i < trimmed.length)
        if (ticked.length < 2) next.options = 'Tick at least two correct answers.'
        else if (ticked.some((i) => !trimmed[i])) next.options = 'A correct answer cannot be an empty option.'
      } else if (!next.optionRows[correctIndex] && !trimmed[correctIndex]) next.options = 'Select the correct answer.'
    }
    setErrors(next)
    if (next.text || next.marks || next.category || next.explanation || next.options || Object.keys(next.optionRows).length > 0) {
      setError('Please fix the highlighted fields.')
      scrollToFirstError(e.currentTarget as HTMLElement)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        courseId,
        type,
        category: category.trim() || 'Final Assessment',
        text: text.trim(),
        options: trimmed,
        correctIndex: type === 'multi choice' ? (correctSet[0] ?? 0) : correctIndex,
        correctIndices: type === 'multi choice' ? correctSet.filter((i) => i < trimmed.length) : [correctIndex],
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
      size="lg"
      tone="brand"
      icon={<HelpCircle size={20} />}
    >
      {/* Same popup size as the module form (860px wide, fixed minimum height), buttons pinned to the bottom. */}
      <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3" style={{ minHeight: 'min(678px, calc(100vh - 240px))' }}>
        {error && <Notice tone="error">{error}</Notice>}

        <div className="row g-3">
          <div className="col-md-6">
            <Field label="Course" required>
              <Select disabled value={courseId} onChange={setCourseId} options={courses.map((c) => ({ value: c.id, label: c.name }))} style={{ width: '100%' }} />
            </Field>
          </div>
          <div className="col-md-6">
            <Field label="Category" error={errors.category}>
              <Input value={category} onChange={(e) => { setCategory(e.target.value); clearError('category') }} status={errors.category ? 'error' : undefined} placeholder="Enter category" />
            </Field>
          </div>
        </div>

        <Field label="Question" required error={errors.text}>
          <Input.TextArea value={text} onChange={(e) => { setText(e.target.value); clearError('text') }} rows={2} status={errors.text ? 'error' : undefined} placeholder="Enter question text" style={{ minHeight: 72 }} />
        </Field>

        <div className="row g-3">
          <div className="col-md-6">
            <Field label="Type">
              <Select value={type} onChange={setType} options={TYPE_OPTIONS} style={{ width: '100%' }} />
            </Field>
          </div>
          <div className="col-md-6">
            <Field label="Marks" error={errors.marks}>
              <Input type="number" min={1} value={marks} onChange={(e) => { setMarks(e.target.value); clearError('marks') }} status={errors.marks ? 'error' : undefined} />
            </Field>
          </div>
        </div>

        {type === 'true false' ? (
          <Field label="Correct Answer" required>
            <Radio.Group value={correctIndex} onChange={(e) => setCorrectIndex(e.target.value)}>
              <Radio value={0}>True</Radio>
              <Radio value={1}>False</Radio>
            </Radio.Group>
          </Field>
        ) : (
          <Field label="Options" required error={errors.options} hint={type === 'multi choice' ? 'Tick every correct answer (at least two)' : 'Select the radio button next to the correct answer'}>
            <Radio.Group value={correctIndex} onChange={(e) => setCorrectIndex(e.target.value)} className="w-100">
              <div className="d-flex flex-column gap-2">
                {options.map((opt, i) => (
                  <div key={i} className="d-flex align-items-center gap-2">
                    {type === 'multi choice' ? <Checkbox checked={correctSet.includes(i)} onChange={() => toggleCorrect(i)} /> : <Radio value={i} />}
                    <div className="flex-grow-1">
                      <Input
                        value={opt}
                        onChange={(e) => {
                          updateOption(i, e.target.value)
                          setErrors((p) => ({ ...p, options: undefined, optionRows: { ...p.optionRows, [i]: '' } }))
                        }}
                        status={errors.optionRows[i] ? 'error' : undefined}
                        placeholder={`Enter option ${i + 1}`}
                      />
                      {errors.optionRows[i] && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>{errors.optionRows[i]}</div>}
                    </div>
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

        <Field label="Explanation (optional, shown after grading)" error={errors.explanation}>
          <Input.TextArea value={explanation} onChange={(e) => { setExplanation(e.target.value); clearError('explanation') }} rows={2} status={errors.explanation ? 'error' : undefined} placeholder="Enter explanation (optional)" style={{ minHeight: 72 }} />
        </Field>

        <div className="d-flex justify-content-end gap-3 pt-3 border-top mt-auto">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {saving ? 'Saving…' : question ? 'Save Changes' : 'Create Question'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
