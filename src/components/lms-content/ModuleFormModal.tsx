import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FileText, ImagePlus, Film, FileUp, X } from 'lucide-react'
import { Button, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { RichTextEditor } from '../ui/RichTextEditor'
import { ScormUpload, type ScormSelection } from '../courses/ScormUpload'
import { discardIfStaged } from '../courses/scormStaging'
import { api, errorMessage, API_ORIGIN, type Course, type CourseModule, type CourseModuleInput } from '../../api'

const types: CourseModule['type'][] = ['text', 'image', 'video', 'document', 'hybrid', 'scorm']

const MEDIA_MAX_MB = 100
// Mirrors the backend's per-Content-Type allow-list (services/module_media.py); "hybrid" accepts any of them.
const MEDIA_ACCEPT: Record<string, string> = {
  image: 'image/png,image/jpeg,image/gif,image/webp',
  video: 'video/mp4,video/webm,video/quicktime,video/ogg',
  document: '.pdf,.doc,.docx,.ppt,.pptx',
}
MEDIA_ACCEPT.hybrid = [MEDIA_ACCEPT.image, MEDIA_ACCEPT.video, MEDIA_ACCEPT.document].join(',')
const MEDIA_EXTENSIONS: Record<string, string[]> = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  video: ['.mp4', '.webm', '.mov', '.ogg'],
  document: ['.pdf', '.doc', '.docx', '.ppt', '.pptx'],
}
MEDIA_EXTENSIONS.hybrid = [...MEDIA_EXTENSIONS.image, ...MEDIA_EXTENSIONS.video, ...MEDIA_EXTENSIONS.document]

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.ogg'])
const extOf = (name: string) => name.slice(name.lastIndexOf('.')).toLowerCase()

type Errors = Partial<Record<'title' | 'order' | 'media' | 'scorm', string>>

export function ModuleFormModal({
  module,
  courses,
  defaultCourseId,
  nextOrder,
  onClose,
  onSave,
}: {
  module?: CourseModule
  courses: Course[]
  defaultCourseId: number
  /** Suggested next order number for a new module in the currently-picked course. */
  nextOrder: number
  onClose: () => void
  onSave: (data: CourseModuleInput) => Promise<void>
}) {
  const [courseId, setCourseId] = useState(module?.courseId ?? defaultCourseId)
  const [title, setTitle] = useState(module?.title ?? '')
  const [type, setType] = useState<CourseModule['type']>(module?.type ?? 'text')
  const [duration, setDuration] = useState(module?.duration ?? '')
  const [order, setOrder] = useState(String(module?.order ?? nextOrder))
  const [status, setStatus] = useState<CourseModule['status']>(module?.status ?? 'Active')
  const [content, setContent] = useState(module?.content ?? '')

  const [media, setMedia] = useState<string | null>(module?.media ?? null)
  const [mediaFileName, setMediaFileName] = useState('')
  const [mediaError, setMediaError] = useState('')
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  // A "scorm" module has no quiz or certificate of its own - those stay course-level concepts (see
  // Course.certificateTemplate / quiz-questions), so attaching SCORM here is just content + progress
  // tracking, the same package/player/progress plumbing a course's own SCORM uses (routers/scorm.py is
  // keyed by package id alone, not by course or module) - just attached one level down.
  const [scorm, setScorm] = useState<ScormSelection | null>(
    module?.scormPackage
      ? { packageId: module.scormPackage, title: module.scormTitle ?? '', version: module.scormVersion ?? '1.2', launchFile: module.launchFile ?? '' }
      : null,
  )
  const [scormBusy, setScormBusy] = useState(false)

  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const showMedia = type !== 'text' && type !== 'scorm'
  const showEditor = type === 'text' || type === 'hybrid'
  const showScorm = type === 'scorm'

  // Same as CourseFormModal: an uploaded ZIP is extracted on the server right away but only belongs to
  // the module once it is saved - discard it if the form closes without saving.
  const latestScorm = useRef(scorm)
  const saved = useRef(false)
  useEffect(() => {
    latestScorm.current = scorm
  }, [scorm])
  useEffect(() => {
    const onPageHide = () => {
      if (!saved.current) discardIfStaged(latestScorm.current, true)
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      if (!saved.current) discardIfStaged(latestScorm.current)
    }
  }, [])

  const changeType = (next: CourseModule['type']) => {
    setType(next)
    if (next !== type) {
      setMedia(null) // a file uploaded for one Content Type may not be allowed for another - start clean
      setMediaFileName('')
      setMediaError('')
      if (next !== 'scorm' && scorm) {
        discardIfStaged(scorm)
        setScorm(null)
      }
    }
  }

  const handleMediaChange = async (file: File | undefined) => {
    if (!file) return
    setMediaError('')
    const allowed = MEDIA_EXTENSIONS[type] ?? []
    if (!allowed.includes(extOf(file.name))) {
      setMediaError(`That file type isn't allowed for a ${type} module. Allowed: ${allowed.join(', ')}`)
      return
    }
    if (file.size > MEDIA_MAX_MB * 1024 * 1024) {
      setMediaError(`File exceeds the ${MEDIA_MAX_MB} MB limit.`)
      return
    }
    setUploadingMedia(true)
    try {
      const { media: id } = await api.uploadModuleMedia(file, type)
      setMedia(id)
      setMediaFileName(file.name)
    } catch (e) {
      setMediaError(errorMessage(e))
    } finally {
      setUploadingMedia(false)
    }
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!title.trim()) next.title = 'Module title is required.'
    else if (title.trim().length > 200) next.title = 'Title must be 200 characters or fewer.'

    const n = Number(order)
    if (order.trim() === '' || !Number.isInteger(n) || n < 1) next.order = 'Enter a whole number of 1 or more.'

    if (showMedia && type !== 'hybrid' && !media) next.media = `Upload a file for this ${type} module.`
    if (showScorm && !scorm) next.scorm = 'Upload a SCORM package for this module.'

    return next
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setError('')
    try {
      const data: CourseModuleInput = {
        courseId,
        title: title.trim(),
        type,
        duration: duration.trim() || null,
        order: Number(order),
        status,
        content: showEditor ? content : '',
        media: showMedia ? media : null,
      }
      // Only send SCORM changes: a newly uploaded package attaches (or replaces), clearing it detaches.
      if (scorm && scorm.packageId !== module?.scormPackage) data.scormPackage = scorm.packageId
      else if (!scorm && module?.scormPackage) data.removeScorm = true
      await onSave(data)
      saved.current = true // the uploaded package is now attached to the module - keep it
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  const mediaUrl = media ? `${API_ORIGIN}/course-modules/media/${media}` : null
  const mediaExt = media ? extOf(mediaFileName || media) : ''

  return (
    <Modal
      title={module ? 'Edit Module' : 'Add Module'}
      subtitle={module ? `${module.course} · module ${module.order}` : 'Author a content unit for a course'}
      onClose={onClose}
      size="lg"
      tone="brand"
      icon={<FileText size={20} />}
    >
      <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}

        <div className="row g-3">
          <div className="col-md-6">
            <Field label="Course" required>
              <Select value={courseId} onChange={setCourseId} options={courses.map((c) => ({ value: c.id, label: c.name }))} style={{ width: '100%' }} />
            </Field>
          </div>
          <div className="col-md-6">
            <Field label="Content Type" required>
              <Select
                value={type}
                onChange={changeType}
                options={types.map((t) => ({ value: t, label: t === 'scorm' ? 'SCORM' : t[0].toUpperCase() + t.slice(1) }))}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        </div>

        <Field label="Module Title" required error={errors.title}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Enter module title"
            status={errors.title ? 'error' : undefined}
          />
        </Field>

        <div className="row g-3">
          <div className="col-6 col-md-4">
            <Field label="Sequence Order" error={errors.order}>
              <Input type="number" min={1} value={order} onChange={(e) => setOrder(e.target.value)} status={errors.order ? 'error' : undefined} />
            </Field>
          </div>
          <div className="col-6 col-md-4">
            <Field label="Duration">
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Enter duration" />
            </Field>
          </div>
          <div className="col-12 col-md-4">
            <Field label="Status">
              <Select
                value={status}
                onChange={setStatus}
                options={(['Active', 'Inactive'] as const).map((st) => ({ value: st, label: st }))}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        </div>

        {showScorm && (
          <Field label="SCORM Content" required error={errors.scorm} hint="No quiz or certificate at the module level - those stay set on the course.">
            <ScormUpload value={scorm} onChange={setScorm} onBusyChange={setScormBusy} />
          </Field>
        )}

        {showMedia && (
          <Field
            label={type === 'hybrid' ? 'Attachment (optional)' : `Module ${type[0].toUpperCase() + type.slice(1)}`}
            required={type !== 'hybrid'}
            error={mediaError || errors.media}
            hint={
              (type === 'image' && `PNG/JPG/GIF/WEBP, up to ${MEDIA_MAX_MB} MB.`) ||
              (type === 'video' && `MP4/WEBM/MOV/OGG, up to ${MEDIA_MAX_MB} MB.`) ||
              (type === 'document' && `PDF/DOC/DOCX/PPT/PPTX, up to ${MEDIA_MAX_MB} MB.`) ||
              (type === 'hybrid' && `Optional image, video, or document, up to ${MEDIA_MAX_MB} MB.`) ||
              undefined
            }
          >
            <div className="d-flex align-items-center gap-2">
              <Button
                icon={type === 'video' ? <Film size={14} /> : type === 'document' ? <FileUp size={14} /> : <ImagePlus size={14} />}
                onClick={() => mediaInputRef.current?.click()}
                loading={uploadingMedia}
              >
                Choose File
              </Button>
              <span className="small text-secondary text-truncate">
                {uploadingMedia ? 'Uploading…' : mediaFileName || (media ? 'Current file kept' : 'No file chosen')}
              </span>
              {media && !uploadingMedia && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<X size={14} />}
                  aria-label="Remove file"
                  onClick={() => {
                    setMedia(null)
                    setMediaFileName('')
                  }}
                />
              )}
            </div>

            {mediaUrl && !uploadingMedia && (
              <div className="mt-2">
                {IMAGE_EXT.has(mediaExt) ? (
                  <img src={mediaUrl} alt="Attachment preview" className="rounded-2 border" style={{ maxWidth: 200, maxHeight: 120, objectFit: 'cover' }} />
                ) : VIDEO_EXT.has(mediaExt) ? (
                  <video src={mediaUrl} controls className="rounded-2 border" style={{ maxWidth: 260, maxHeight: 150 }} />
                ) : (
                  <a href={mediaUrl} target="_blank" rel="noreferrer" className="small">
                    {mediaFileName || 'View attached file'}
                  </a>
                )}
              </div>
            )}
            <input
              ref={mediaInputRef}
              type="file"
              accept={MEDIA_ACCEPT[type]}
              className="d-none"
              onChange={(e) => void handleMediaChange(e.target.files?.[0])}
            />
          </Field>
        )}

        {showEditor && (
          <Field label="Module Content (HTML supported)">
            <RichTextEditor value={content} onChange={setContent} placeholder="Enter module content" />
          </Field>
        )}

        <div className="d-flex justify-content-end gap-3 pt-3 border-top">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving} disabled={uploadingMedia || scormBusy}>
            {saving ? 'Saving…' : uploadingMedia || scormBusy ? 'Uploading…' : module ? 'Save Changes' : 'Create Module'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
