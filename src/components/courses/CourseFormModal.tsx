import { useEffect, useRef, useState, type FormEvent } from 'react'
import { GraduationCap } from 'lucide-react'
import { Button, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Badge } from '../ui/Badge'
import { errorMessage, type CategoryType, type Course, type CourseInput, type CourseLevel } from '../../api'
import { Notice } from '../ui/State'
import { useData, useDataNeeds } from '../../context/DataContext'
import { ScormUpload, type ScormSelection } from './ScormUpload'
import { discardIfStaged } from './scormStaging'

type Errors = Partial<Record<'name' | 'category', string>>

const FIELD_ORDER: (keyof Errors)[] = ['name', 'category']

export function CourseFormModal({ course, onClose, onSave }: { course?: Course; onClose: () => void; onSave: (course: CourseInput) => Promise<void> }) {
  const { courseOptions } = useData()
  useDataNeeds('courseOptions')
  const [name, setName] = useState(course?.name ?? '')
  const [category, setCategory] = useState<CategoryType | undefined>(course?.category)
  const [level] = useState<CourseLevel | undefined>(course?.level ?? undefined)
  const [errors, setErrors] = useState<Errors>({})
  const [description, setDescription] = useState(course?.description ?? '')
  const [price, setPrice] = useState(String(course?.price ?? 0))
  const [status, setStatus] = useState<Course['status']>(course?.status ?? 'Active')
  const [lmsCourseId, setLmsCourseId] = useState(course?.lmsCourseId ?? '')

  const numericPrice = Number(price) || 0
  const type: Course['type'] = numericPrice > 0 ? 'Paid' : 'Free'

  const [scorm, setScorm] = useState<ScormSelection | null>(
    course?.scormPackage
      ? { packageId: course.scormPackage, title: course.scormTitle ?? '', version: course.scormVersion ?? '1.2', launchFile: course.launchFile ?? '' }
      : null,
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // An uploaded ZIP is extracted on the server straight away but only belongs to the course once it is
  // saved. If the form goes away without saving (Cancel, X, click outside, another page, a closing tab),
  // delete the package rather than leaving it on the server.
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
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return // Enter pressed again while the first save is still running
    const nextErrors: Errors = {}
    if (!name.trim()) nextErrors.name = 'Please enter a title.'
    if (!category) nextErrors.category = 'Please select a category.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const firstKey = FIELD_ORDER.find((k) => nextErrors[k])
      if (firstKey) document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSaving(true)
    setError('')
    try {
      const data: CourseInput = {
        name: name.trim(),
        category: category!,
        level: level ?? null,
        description,
        price: numericPrice,
        type,
        status,
        lmsCourseId: lmsCourseId.trim(),
      }
      // Only send SCORM changes: a newly uploaded package attaches (or replaces), clearing it detaches.
      if (scorm && scorm.packageId !== course?.scormPackage) data.scormPackage = scorm.packageId
      else if (!scorm && course?.scormPackage) data.removeScorm = true
      await onSave(data)
      saved.current = true // the uploaded package is now attached to the course - keep it
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={course ? 'Edit Course' : 'Add Course'}
      subtitle="Upload a SCORM package and set the catalog details"
      onClose={onClose}
      size="lg"
      tone="brand"
      icon={<GraduationCap size={20} />}
    >
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        <div id="field-name">
          <Field label="Course Name" required error={errors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter course title"
              status={errors.name ? 'error' : undefined}
            />
          </Field>
        </div>

        <div className="row g-3">
          <div className="col-12" id="field-category">
            <Field label="Category" required error={errors.category}>
              <Select
                value={category}
                onChange={setCategory}
                options={courseOptions.categoryTypes.map((c) => ({ value: c, label: c }))}
                placeholder="Select category"
                status={errors.category ? 'error' : undefined}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        </div>

        <Field label="Description">
          <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Enter course summary" />
        </Field>

        <div className="row g-3">
          <div className="col-6">
            <Field label="Price (₹, 0 for free)" required>
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} prefix="₹" />
            </Field>
          </div>
          <div className="col-6">
            <Field label="Type" hint="Free when the price is 0">
              <div>
                <Badge tone={type === 'Free' ? 'green' : 'blue'}>{type}</Badge>
              </div>
            </Field>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-6">
            <Field label="Status">
              <Select
                value={status}
                onChange={setStatus}
                options={(['Active', 'Inactive'] as const).map((st) => ({ value: st, label: st }))}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
          <div className="col-6">
            <Field label="Mapping to Existing LMS Course ID">
              <Input value={lmsCourseId} onChange={(e) => setLmsCourseId(e.target.value)} placeholder="Enter LMS course ID (auto-generated if blank)" />
            </Field>
          </div>
        </div>

        <ScormUpload value={scorm} onChange={setScorm} onBusyChange={setUploading} />

        <div className="d-flex justify-content-end gap-3 pt-3 border-top">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving} disabled={uploading}>
            {saving ? 'Saving…' : uploading ? 'Uploading…' : 'Save Course'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
