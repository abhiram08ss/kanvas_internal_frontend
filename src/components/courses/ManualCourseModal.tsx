import { useRef, useState, type FormEvent } from 'react'
import { BookOpen, ImagePlus, X } from 'lucide-react'
import { App, Button, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import {
  CERT_MONTHS_MAX,
  CODE_MAX,
  COVER_MAX_MB,
  DESCRIPTION_MAX,
  MESSAGE_MAX,
  OUTCOME_MAX,
  OUTCOMES_MAX,
  TITLE_MAX,
  normalizeCode,
  normalizeQuizCount,
  validateCategory,
  validateCertMonths,
  validateCertificateTemplate,
  validateCode,
  validateCompletionMessage,
  validateCoverFile,
  validateDescription,
  validateDuration,
  validateOutcomes,
  validatePassScore,
  validateQuizCount,
  validateTitle,
} from '../../utils/courseValidation'
import { useData, useDataNeeds } from '../../context/DataContext'
import { api, errorMessage, API_ORIGIN, type CategoryType, type Course, type CourseInput, type CourseLevel } from '../../api'

type Errors = Partial<Record<'title' | 'code' | 'category' | 'description' | 'completionMessage' | 'passScore' | 'durationHours' | 'quizQuestionCount' | 'certValidMonths' | 'certificateTemplate' | 'cover', string>>

// Top-to-bottom form order, so a failed submit scrolls to whichever invalid field appears first.
const FIELD_ORDER: (keyof Errors)[] = ['title', 'code', 'category', 'cover', 'description', 'passScore', 'durationHours', 'quizQuestionCount', 'certValidMonths', 'certificateTemplate', 'completionMessage']

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
  const { certificateTemplates, courseOptions, quizQuestions } = useData()
  const { notification } = App.useApp()
  useDataNeeds('courseOptions', 'quizQuestions')
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

  // Quiz questions this course already has (only known when editing); used to cap "Quiz Question Count".
  const availableQuestions = course ? quizQuestions.filter((q) => q.courseId === course.id).length : undefined
  const outcomeErrors = validateOutcomes(outcomes)
  const [outcomeShown, setOutcomeShown] = useState(false) // outcome errors appear after the first blur or submit

  /** One field's current problem (or null). The single source of truth for blur, change and submit. */
  const check = (key: keyof Errors): string | null => {
    switch (key) {
      case 'title':
        return validateTitle(title)
      case 'code':
        return course ? null : validateCode(code)
      case 'category':
        return validateCategory(category, courseOptions.categoryTypes)
      case 'description':
        return validateDescription(description)
      case 'passScore':
        return validatePassScore(passScore)
      case 'durationHours':
        return validateDuration(durationHours)
      case 'quizQuestionCount':
        return validateQuizCount(quizQuestionCount, availableQuestions)
      case 'certValidMonths':
        return validateCertMonths(certValidMonths)
      case 'certificateTemplate':
        return validateCertificateTemplate(certificateTemplate, certificateTemplateOptions)
      case 'completionMessage':
        return validateCompletionMessage(completionMessage)
      default:
        return null
    }
  }
  /** Re-checks one field and stores the result. `values` overrides state that has not re-rendered yet. */
  const touch = (key: keyof Errors) => setErrors((prev) => ({ ...prev, [key]: check(key) ?? undefined }))
  // After a field was flagged, every keystroke re-checks it so the message updates or disappears as soon as it is fixed.
  const recheck = (key: keyof Errors, next: () => string | null) => setErrors((prev) => (prev[key] ? { ...prev, [key]: next() ?? undefined } : prev))

  const validate = (): Errors => {
    const next: Errors = {}
    for (const key of FIELD_ORDER) {
      const msg = check(key)
      if (msg) next[key] = msg
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
    const problem = await validateCoverFile(file)
    if (problem) {
      setErrors((prev) => ({ ...prev, cover: problem }))
      if (coverInputRef.current) coverInputRef.current.value = ''
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
      if (coverInputRef.current) coverInputRef.current.value = '' // lets the same file be chosen again
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving || uploadingCover) return // never submit twice
    const nextErrors = validate()
    setErrors(nextErrors)
    setOutcomeShown(true)
    if (Object.keys(nextErrors).length > 0 || Object.keys(outcomeErrors).length > 0) {
      setError('Please fix the highlighted fields.')
      const firstKey = FIELD_ORDER.find((k) => nextErrors[k])
      const target = document.getElementById(firstKey ? `field-${firstKey}` : 'field-outcomes')
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target?.querySelector<HTMLElement>('input, textarea, .ant-select-selector')?.focus({ preventScroll: true })
      return
    }

    setSaving(true)
    setError('')
    try {
      const data: Partial<CourseInput> = {
        name: title.trim().replace(/\s+/g, ' '),
        category: category!,
        level: level ?? null,
        description: description.trim(),
        coverImage,
        passScore: Number(passScore),
        durationHours: durationHours.trim() ? Number(durationHours) : null,
        quizQuestionCount: normalizeQuizCount(quizQuestionCount) || null,
        certValidMonths: certValidMonths.trim() ? Number(certValidMonths) : null,
        certificateTemplate,
        completionMessage: completionMessage.trim(),
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
      notification.error({ title: course ? 'Could Not Save the Course' : 'Could Not Create the Course', description: errorMessage(err) })
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
                  onChange={(e) => { setTitle(e.target.value); recheck('title', () => validateTitle(e.target.value)) }}
                  onBlur={() => touch('title')}
                  placeholder="Enter course title"
                  maxLength={TITLE_MAX}
                  status={errors.title ? 'error' : undefined}
                />
              </Field>
            </div>
            <div className="col-md-6" id="field-code">
              <Field
                label="Course Code"
                required={!course}
                error={errors.code}
                hint={course ? "Code can't be changed after creation." : 'Capital letters, numbers, - and _ (e.g. REACT101, CS_01). Up to ' + CODE_MAX + ' characters.'}
              >
                <Input
                  value={code}
                  onChange={(e) => { const v = normalizeCode(e.target.value); setCode(v); recheck('code', () => validateCode(v)) }}
                  onBlur={() => touch('code')}
                  disabled={!!course}
                  maxLength={CODE_MAX}
                  placeholder="Enter course code"
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
                  onChange={(v) => { setCategory(v); setErrors((prev) => ({ ...prev, category: validateCategory(v, courseOptions.categoryTypes) ?? undefined })) }}
                  onBlur={() => touch('category')}
                  options={courseOptions.categoryTypes.map((c) => ({ value: c, label: c }))}
                  placeholder="Select category"
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
                        onClick={(e) => { e.stopPropagation(); setCoverImage(null); setCoverFileName(''); setErrors((prev) => ({ ...prev, cover: undefined })) }}
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
                        <span className="small text-secondary mt-1">PNG, JPG, GIF or WEBP · up to {COVER_MAX_MB} MB · optional</span>
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
              onChange={(e) => { setDescription(e.target.value); recheck('description', () => validateDescription(e.target.value)) }}
              onBlur={() => touch('description')}
              status={errors.description ? 'error' : undefined}
              rows={3}
              placeholder="Enter what learners will take away from this course"
            />
            <div className="text-end mt-1" style={{ fontSize: 11.5, color: description.length > DESCRIPTION_MAX ? '#dc2626' : '#9b87b5' }}>
              {description.length.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()}
            </div>
          </Field>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          <SectionTitle>What You&apos;ll Learn</SectionTitle>
          <div id="field-outcomes">
          <Field label="Outcomes" hint={`Optional. Shown as a checklist on the course preview card. ${OUTCOME_MAX} characters each, up to ${OUTCOMES_MAX}.`}>
            <div className="d-flex flex-column gap-2">
              {outcomes.map((outcome, i) => (
                <div key={i}>
                <div className="d-flex align-items-center gap-2">
                  <Input
                    value={outcome}
                    onChange={(e) => updateOutcome(i, e.target.value)}
                    onBlur={() => setOutcomeShown(true)}
                    maxLength={OUTCOME_MAX}
                    status={outcomeShown && outcomeErrors[i] ? 'error' : undefined}
                    placeholder="Enter an outcome"
                  />
                  {(outcome || outcomes.length > 1) && (
                    <Button type="text" danger size="small" icon={<X size={14} />} aria-label="Remove outcome" onClick={() => removeOutcome(i)} />
                  )}
                </div>
                {outcomeShown && outcomeErrors[i] && <div className="mt-1" style={{ fontSize: 12, color: '#dc2626' }}>{outcomeErrors[i]}</div>}
                </div>
              ))}
            </div>
          </Field>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          <SectionTitle>Assessment &amp; Certification</SectionTitle>

          <div className="row g-3">
            <div className="col-6 col-md-3" id="field-passScore">
              <Field label="Pass Score (%)" error={errors.passScore}>
                <Input
                  inputMode="numeric"
                  maxLength={3}
                  value={passScore}
                  onChange={(e) => { setPassScore(e.target.value); recheck('passScore', () => validatePassScore(e.target.value)) }}
                  onBlur={() => touch('passScore')}
                  status={errors.passScore ? 'error' : undefined}
                />
              </Field>
            </div>
            <div className="col-6 col-md-3" id="field-durationHours">
              <Field label="Duration (hours)" error={errors.durationHours}>
                <Input
                  inputMode="decimal"
                  maxLength={7}
                  value={durationHours}
                  onChange={(e) => { setDurationHours(e.target.value); recheck('durationHours', () => validateDuration(e.target.value)) }}
                  onBlur={() => touch('durationHours')}
                  placeholder="Enter duration in hours (optional)"
                  status={errors.durationHours ? 'error' : undefined}
                />
              </Field>
            </div>
            <div className="col-6 col-md-3" id="field-quizQuestionCount">
              <Field label="Quiz Question Count" error={errors.quizQuestionCount} hint={availableQuestions ? `Blank or "all" = every question (this course has ${availableQuestions}).` : 'Blank or "all" = every question.'}>
                <Input
                  value={quizQuestionCount}
                  onChange={(e) => { setQuizQuestionCount(e.target.value); recheck('quizQuestionCount', () => validateQuizCount(e.target.value, availableQuestions)) }}
                  onBlur={() => { setQuizQuestionCount((v) => normalizeQuizCount(v)); touch('quizQuestionCount') }}
                  placeholder="Enter number of questions (blank = all)"
                  maxLength={20}
                  status={errors.quizQuestionCount ? 'error' : undefined}
                />
              </Field>
            </div>
            <div className="col-6 col-md-3" id="field-certValidMonths">
              <Field label="Cert Valid (Months)" error={errors.certValidMonths} hint="Blank = never expires.">
                <Input
                  inputMode="numeric"
                  maxLength={String(CERT_MONTHS_MAX).length}
                  value={certValidMonths}
                  onChange={(e) => { setCertValidMonths(e.target.value); recheck('certValidMonths', () => validateCertMonths(e.target.value)) }}
                  onBlur={() => touch('certValidMonths')}
                  placeholder="Enter months (blank = never expires)"
                  status={errors.certValidMonths ? 'error' : undefined}
                />
              </Field>
            </div>
          </div>

          <div id="field-certificateTemplate">
          <Field label="Certificate Template" error={errors.certificateTemplate}>
            <Select
              value={certificateTemplate}
              status={errors.certificateTemplate ? 'error' : undefined}
              onChange={(v) => { setCertificateTemplate(v); setErrors((prev) => ({ ...prev, certificateTemplate: validateCertificateTemplate(v, certificateTemplateOptions) ?? undefined })) }}
              options={certificateTemplateOptions.map((t) => ({ value: t, label: t }))}
              style={{ width: '100%' }}
            />
          </Field>
          </div>
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
              onChange={(e) => { setCompletionMessage(e.target.value); recheck('completionMessage', () => validateCompletionMessage(e.target.value)) }}
              onBlur={() => touch('completionMessage')}
              status={errors.completionMessage ? 'error' : undefined}
              rows={3}
              placeholder="Enter the message shown to employees when they finish the course"
            />
            <div className="text-end mt-1" style={{ fontSize: 11.5, color: completionMessage.length > MESSAGE_MAX ? '#dc2626' : '#9b87b5' }}>
              {completionMessage.length.toLocaleString()} / {MESSAGE_MAX.toLocaleString()}
            </div>
          </Field>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-3 pt-3 border-top">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving} disabled={saving || uploadingCover}>
            {saving ? 'Saving…' : uploadingCover ? 'Uploading…' : course ? 'Save Changes' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
