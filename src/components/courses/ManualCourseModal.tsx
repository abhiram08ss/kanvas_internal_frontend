import { useRef, useState, type FormEvent } from 'react'
import { BookOpen, ImagePlus, X } from 'lucide-react'
import { Button, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { useData, useDataNeeds } from '../../context/DataContext'
import { api, errorMessage, API_ORIGIN, type CategoryType, type Course, type CourseInput, type CourseLevel } from '../../api'

const COVER_MAX_MB = 5
const COVER_ACCEPT = { 'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/gif': 'GIF', 'image/webp': 'WEBP' }
const CODE_RE = /^[A-Za-z0-9_-]+$/
const QUIZ_COUNT_RE = /^(all|\d+)$/i

type Errors = Partial<Record<'title' | 'code' | 'category' | 'description' | 'completionMessage' | 'passScore' | 'durationHours' | 'quizQuestionCount' | 'certValidMonths' | 'cover', string>>

// Top-to-bottom form order, so a failed submit scrolls to whichever invalid field appears first.
const FIELD_ORDER: (keyof Errors)[] = ['title', 'code', 'category', 'cover', 'description', 'passScore', 'durationHours', 'quizQuestionCount', 'certValidMonths', 'completionMessage']

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="mb-0 fw-bold text-uppercase" style={{ fontSize: 11, letterSpacing: '.04em', color: '#9b87b5' }}>
      {children}
    </p>
  )
}

/** Mirrors the manual "Create New Course" authoring form used by the underlying LMS product. */
export function ManualCourseModal({
  course,
  onClose,
  onSave,
}: {
  /** Present when editing an existing course; absent when creating a new one. */
  course?: Course
  onClose: () => void
  onSave: (course: Partial<CourseInput>) => Promise<void>
}) {
  const { certificateTemplates, courseOptions } = useData()
  useDataNeeds('courseOptions')
  const certificateTemplateOptions = [
    'Default (no template)',
    ...certificateTemplates.filter((t) => t.status === 'Active' && t.name !== 'Default (no template)').map((t) => t.name),
  ]

  const [title, setTitle] = useState(course?.name ?? '')
  const [code, setCode] = useState(course?.code ?? '')
  const [category, setCategory] = useState<CategoryType | undefined>(course?.category)
  const [level] = useState<CourseLevel | undefined>(course?.level ?? undefined)
  const [description, setDescription] = useState(course?.description ?? '')
  const [passScore, setPassScore] = useState(String(course?.passScore ?? 0))
  const [durationHours, setDurationHours] = useState(course?.durationHours != null ? String(course.durationHours) : '')
  const [quizQuestionCount, setQuizQuestionCount] = useState(course?.quizQuestionCount ?? '')
  const [certValidMonths, setCertValidMonths] = useState(course?.certValidMonths != null ? String(course.certValidMonths) : '24')
  const [certificateTemplate, setCertificateTemplate] = useState(course?.certificateTemplate ?? certificateTemplateOptions[0])
  const [completionMessage, setCompletionMessage] = useState(course?.completionMessage ?? '')
  // "What you'll learn" bullets for the course preview card. Always keep one trailing blank input so
  // there's somewhere to type the next bullet; blanks are dropped on save.
  const [outcomes, setOutcomes] = useState<string[]>(course?.learningOutcomes?.length ? [...course.learningOutcomes, ''] : [''])

  const [coverImage, setCoverImage] = useState<string | null>(course?.coverImage ?? null)
  const [coverFileName, setCoverFileName] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverDragActive, setCoverDragActive] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Clears a field's validation error as soon as the user edits it.
  const clearError = (key: keyof Errors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))

  const validate = (): Errors => {
    const next: Errors = {}
    if (!title.trim()) next.title = 'Title is required.'
    else if (title.trim().length > 200) next.title = 'Title must be 200 characters or fewer.'

    if (!course) {
      if (!code.trim()) next.code = 'Course code is required.'
      else if (code.trim().length > 20) next.code = 'Code must be 20 characters or fewer.'
      else if (!CODE_RE.test(code.trim())) next.code = 'Only letters, numbers, - and _ are allowed.'
    }

    if (!category) next.category = 'Please select a category.'

    if (!description.trim()) next.description = 'Description is required.'
    if (!completionMessage.trim()) next.completionMessage = 'Completion message is required.'

    const ps = Number(passScore)
    if (passScore.trim() === '' || Number.isNaN(ps) || ps < 0 || ps > 100) next.passScore = 'Enter a whole number between 0 and 100.'

    if (durationHours.trim() && (Number.isNaN(Number(durationHours)) || Number(durationHours) < 0)) {
      next.durationHours = 'Enter a duration of 0 or more.'
    }

    if (quizQuestionCount.trim() && !QUIZ_COUNT_RE.test(quizQuestionCount.trim())) {
      next.quizQuestionCount = 'Leave blank, type "all", or enter a number.'
    }

    if (certValidMonths.trim() && (!Number.isInteger(Number(certValidMonths)) || Number(certValidMonths) < 0)) {
      next.certValidMonths = 'Enter a whole number of 0 or more.'
    }

    return next
  }

  const updateOutcome = (i: number, value: string) => {
    setOutcomes((prev) => {
      const next = [...prev]
      next[i] = value
      if (i === next.length - 1 && value.trim()) next.push('') // keep one trailing blank to type into
      return next
    })
  }
  const removeOutcome = (i: number) => setOutcomes((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : ['']))

  const handleCoverChange = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setErrors((prev) => ({ ...prev, cover: undefined }))
    if (!(file.type in COVER_ACCEPT)) {
      setErrors((prev) => ({ ...prev, cover: 'Only PNG, JPG, GIF, or WEBP images are allowed.' }))
      return
    }
    if (file.size > COVER_MAX_MB * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, cover: `Image exceeds the ${COVER_MAX_MB} MB limit.` }))
      return
    }
    setUploadingCover(true)
    try {
      const { coverImage: id } = await api.uploadCourseCover(file)
      setCoverImage(id)
      setCoverFileName(file.name)
    } catch (e) {
      setErrors((prev) => ({ ...prev, cover: errorMessage(e) }))
    } finally {
      setUploadingCover(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const firstKey = FIELD_ORDER.find((k) => nextErrors[k])
      if (firstKey) document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSaving(true)
    setError('')
    try {
      const data: Partial<CourseInput> = {
        name: title.trim(),
        category: category!,
        level: level ?? null,
        description,
        coverImage,
        passScore: Number(passScore),
        durationHours: durationHours.trim() ? Number(durationHours) : null,
        quizQuestionCount: quizQuestionCount.trim() || null,
        certValidMonths: certValidMonths.trim() ? Number(certValidMonths) : null,
        certificateTemplate,
        completionMessage,
        learningOutcomes: outcomes.map((o) => o.trim()).filter(Boolean),
      }
      if (!course) {
        data.code = code.trim().toUpperCase()
        data.price = 0
        data.type = 'Free'
        data.status = 'Active'
        data.lmsCourseId = ''
      }
      await onSave(data)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={course ? 'Edit Course' : 'Create New Course'}
      subtitle={course ? `${course.code} · manual content course` : 'Author a manually-built course for the catalog'}
      onClose={onClose}
      size="lg"
      tone="brand"
      icon={<BookOpen size={20} />}
    >
      <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-4">
        {error && <Notice tone="error">{error}</Notice>}

        <div className="d-flex flex-column gap-3">
          <SectionTitle>Basic Details</SectionTitle>

          <div className="row g-3">
            <div className="col-md-6" id="field-title">
              <Field label="Title" required error={errors.title}>
                <Input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); clearError('title') }}
                  placeholder="Enter your title"
                  maxLength={200}
                  status={errors.title ? 'error' : undefined}
                />
              </Field>
            </div>
            <div className="col-md-6" id="field-code">
              <Field
                label="Course Code"
                required={!course}
                error={errors.code}
                hint={course ? "Code can't be changed after creation." : 'Letters, numbers, - and _ only. Stored in capitals.'}
              >
                <Input
                  value={code}
                  onChange={(e) => { setCode(e.target.value); clearError('code') }}
                  disabled={!!course}
                  maxLength={20}
                  placeholder="Enter your course code"
                  status={errors.code ? 'error' : undefined}
                />
              </Field>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12" id="field-category">
              <Field label="Category" required error={errors.category}>
                <Select
                  value={category}
                  onChange={(v) => { setCategory(v); clearError('category') }}
                  options={courseOptions.categoryTypes.map((c) => ({ value: c, label: c }))}
                  placeholder="Select a category"
                  status={errors.category ? 'error' : undefined}
                  style={{ width: '100%' }}
                />
              </Field>
            </div>
          </div>

          <div id="field-cover">
            <Field
              label="Cover Image"
              error={errors.cover}
              hint={course && !coverFileName ? 'Leave blank to keep the current image.' : undefined}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => coverInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') coverInputRef.current?.click() }}
                onDragOver={(e) => { e.preventDefault(); setCoverDragActive(true) }}
                onDragLeave={() => setCoverDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setCoverDragActive(false)
                  void handleCoverChange(e.dataTransfer.files?.[0])
                }}
                className="position-relative overflow-hidden"
                style={{
                  width: '100%',
                  height: 200,
                  cursor: 'pointer',
                  borderRadius: 12,
                  border: coverImage ? '1px solid #ede8f5' : `2px dashed ${coverDragActive ? '#5c2d91' : '#d8cdeb'}`,
                  background: coverImage ? '#f5f4f8' : coverDragActive ? '#f5effe' : '#faf9fc',
                  transition: 'background 120ms, border-color 120ms',
                }}
              >
                {coverImage && !uploadingCover ? (
                  <>
                    <img
                      src={`${API_ORIGIN}/courses/covers/${coverImage}`}
                      alt="Cover preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div className="position-absolute top-0 end-0 p-2 d-flex gap-2">
                      <Button
                        size="small"
                        icon={<ImagePlus size={12} />}
                        onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click() }}
                      >
                        Change
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<X size={12} />}
                        onClick={(e) => { e.stopPropagation(); setCoverImage(null); setCoverFileName('') }}
                      >
                        Remove
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center px-3">
                    {uploadingCover ? (
                      <span className="small fw-semibold" style={{ color: '#5c2d91' }}>
                        Uploading…
                      </span>
                    ) : (
                      <>
                        <ImagePlus size={32} color="#9b87b5" />
                        <span className="small fw-semibold mt-2" style={{ color: '#5c2d91' }}>
                          Click to upload or drag an image here
                        </span>
                        <span className="small text-secondary mt-1">PNG, JPG, GIF, or WEBP · up to {COVER_MAX_MB} MB</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="d-none"
                onChange={(e) => void handleCoverChange(e.target.files?.[0])}
              />
            </Field>
          </div>

          <div id="field-description">
          <Field label="Description" required error={errors.description}>
            <Input.TextArea
              value={description}
              onChange={(e) => { setDescription(e.target.value); clearError('description') }}
              status={errors.description ? 'error' : undefined}
              rows={3}
              placeholder="What will learners take away from this course?"
            />
          </Field>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          <SectionTitle>What You&apos;ll Learn</SectionTitle>
          <Field label="Outcomes" hint="Shown as a checklist on the course preview card. Leave any blank to skip them.">
            <div className="d-flex flex-column gap-2">
              {outcomes.map((outcome, i) => (
                <div key={i} className="d-flex align-items-center gap-2">
                  <Input
                    value={outcome}
                    onChange={(e) => updateOutcome(i, e.target.value)}
                    maxLength={200}
                    placeholder="Enter an outcome"
                  />
                  {(outcome || outcomes.length > 1) && (
                    <Button type="text" danger size="small" icon={<X size={14} />} aria-label="Remove outcome" onClick={() => removeOutcome(i)} />
                  )}
                </div>
              ))}
            </div>
          </Field>
        </div>

        <div className="d-flex flex-column gap-3">
          <SectionTitle>Assessment &amp; Certification</SectionTitle>

          <div className="row g-3">
            <div className="col-6 col-md-3" id="field-passScore">
              <Field label="Pass Score (%)" error={errors.passScore}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={passScore}
                  onChange={(e) => { setPassScore(e.target.value); clearError('passScore') }}
                  status={errors.passScore ? 'error' : undefined}
                />
              </Field>
            </div>
            <div className="col-6 col-md-3" id="field-durationHours">
              <Field label="Duration (hours)" error={errors.durationHours}>
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={durationHours}
                  onChange={(e) => { setDurationHours(e.target.value); clearError('durationHours') }}
                  placeholder="Optional"
                  status={errors.durationHours ? 'error' : undefined}
                />
              </Field>
            </div>
            <div className="col-6 col-md-3" id="field-quizQuestionCount">
              <Field label="Quiz Question Count" error={errors.quizQuestionCount} hint='Blank or "all" = every question.'>
                <Input
                  value={quizQuestionCount}
                  onChange={(e) => { setQuizQuestionCount(e.target.value); clearError('quizQuestionCount') }}
                  placeholder="all"
                  maxLength={20}
                  status={errors.quizQuestionCount ? 'error' : undefined}
                />
              </Field>
            </div>
            <div className="col-6 col-md-3" id="field-certValidMonths">
              <Field label="Cert Valid (Months)" error={errors.certValidMonths} hint="Blank = never expires.">
                <Input
                  type="number"
                  min={0}
                  value={certValidMonths}
                  onChange={(e) => { setCertValidMonths(e.target.value); clearError('certValidMonths') }}
                  placeholder="Never expires"
                  status={errors.certValidMonths ? 'error' : undefined}
                />
              </Field>
            </div>
          </div>

          <Field label="Certificate Template">
            <Select
              value={certificateTemplate}
              onChange={setCertificateTemplate}
              options={certificateTemplateOptions.map((t) => ({ value: t, label: t }))}
              style={{ width: '100%' }}
            />
          </Field>
        </div>

        <div className="d-flex flex-column gap-3">
          <SectionTitle>Completion Message</SectionTitle>
          <div id="field-completionMessage">
          <Field
            label="Message"
            required
            error={errors.completionMessage}
            hint='Shown under "Congratulations! You&apos;ve successfully completed {Course Title}". Required.'
          >
            <Input.TextArea
              value={completionMessage}
              onChange={(e) => { setCompletionMessage(e.target.value); clearError('completionMessage') }}
              status={errors.completionMessage ? 'error' : undefined}
              rows={3}
              placeholder={'Shown to employees once they finish the course, e.g. "Thank you for completing the … programme. By taking this course…"'}
            />
          </Field>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-3 pt-3 border-top">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving} disabled={uploadingCover}>
            {saving ? 'Saving…' : uploadingCover ? 'Uploading…' : course ? 'Save Changes' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
