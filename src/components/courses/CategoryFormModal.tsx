import { useState, type FormEvent } from 'react'
import { Layers } from 'lucide-react'
import { Button, Input, Select } from 'antd'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Notice } from '../ui/State'
import { useData, useDataNeeds } from '../../context/DataContext'
import { errorMessage, type CategoryType, type CourseCategory, type CourseCategoryInput } from '../../api'

type Errors = Partial<Record<'name' | 'type', string>>

/** Add/edit a sub-category in the capability-framework taxonomy (Course Categories page) - what a
 * course's own Category field picks from. */
export function CategoryFormModal({
  category,
  onClose,
  onSave,
}: {
  /** Present when editing an existing category; absent when creating a new one. */
  category?: CourseCategory
  onClose: () => void
  onSave: (data: CourseCategoryInput) => Promise<void>
}) {
  const { courseOptions } = useData()
  useDataNeeds('courseOptions')
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<CategoryType | undefined>(category?.type)
  const [code, setCode] = useState(category?.code ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: Errors = {}
    if (!name.trim()) nextErrors.name = 'Please enter a name.'
    if (!type) nextErrors.type = 'Please select a type.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), type: type!, code: code.trim() || null, description: description.trim() || null })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={category ? 'Edit Category' : 'New Category'}
      subtitle="A sub-category in the capability-framework taxonomy"
      onClose={onClose}
      tone="brand"
      icon={<Layers size={20} />}
    >
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Name" required error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter category name" status={errors.name ? 'error' : undefined} />
        </Field>
        <div className="row g-3">
          <div className="col-7">
            <Field label="Type" required error={errors.type}>
              <Select
                value={type}
                onChange={setType}
                options={courseOptions.categoryTypes.map((t) => ({ value: t, label: t }))}
                placeholder="Select type"
                status={errors.type ? 'error' : undefined}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
          <div className="col-5">
            <Field label="Code" hint="Optional, e.g. A1.">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter category code" maxLength={10} />
            </Field>
          </div>
        </div>
        <Field label="Description" hint="Optional. Shown when this category is expanded on the Course Categories page.">
          <Input.TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Enter category description"
          />
        </Field>
        <div className="d-flex justify-content-end gap-3 pt-3 border-top">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {saving ? 'Saving…' : category ? 'Save Changes' : 'Add Category'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
