import { useEffect, useState } from 'react'
import { App, Button, Input } from 'antd'
import { CheckCircle2, ClipboardCheck, Eye, Pencil, Trash2, XCircle } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { ListCard } from '../ui/ListCard'
import { DataTable } from '../ui/DataTable'
import { StatCard } from '../ui/StatCard'
import { IconButton } from '../ui/IconButton'
import { ErrorBlock, LoadingBlock, Notice } from '../ui/State'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { ManualCourseModal } from './ManualCourseModal'
import { CoursePreviewModal } from '../lms-content/CoursePreviewModal'
import { useAuth } from '../../context/AuthContext'
import { useDataNeeds } from '../../context/DataContext'
import { api, errorMessage, type Course, type CourseInput } from '../../api'

const statusTone = { draft: 'slate', pending: 'amber', rejected: 'red', approved: 'green' } as const

function RejectReasonModal({ course, onClose, onRejected }: { course: Course; onClose: () => void; onRejected: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!reason.trim()) {
      setError('A reason is required so the creator knows what to fix.')
      return
    }
    setSaving(true)
    try {
      await api.rejectCourse(course.id, reason.trim())
      onRejected()
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  return (
    <Modal title="Reject Course" subtitle={course.name} onClose={onClose} tone="brand" icon={<XCircle size={20} />}>
      <div className="d-flex flex-column gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Reason" required hint="Shown to the creator so they can fix and resubmit.">
          <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Missing SCORM package" />
        </Field>
        <div className="d-flex justify-content-end gap-3 pt-2 border-top">
          <Button onClick={onClose}>Cancel</Button>
          <Button danger type="primary" loading={saving} onClick={() => void submit()}>
            Reject
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Super Admin sees every course awaiting a decision, from anyone, with Approve/Reject. Support Admin sees
 * only their own submissions (that's all the server ever returns them - see GET /courses/pending), with
 * Edit/Delete so they can fix a rejected one and resubmit, or withdraw a course that never went live.
 */
export function CourseApprovalsTab() {
  const { user } = useAuth()
  const isSuper = user?.role === 'Super Admin'
  const { modal } = App.useApp()
  // CoursePreviewModal reads these from useData() itself - loaded here so Preview has them ready.
  useDataNeeds('courseModules', 'quizQuestions', 'certificateTemplates')

  const [courses, setCourses] = useState<Course[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState<Course | null>(null)
  const [rejecting, setRejecting] = useState<Course | null>(null)
  const [previewing, setPreviewing] = useState<Course | null>(null)

  const load = () => {
    setError('')
    api
      .pendingCourses()
      .then(setCourses)
      .catch((e) => setError(errorMessage(e)))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const approve = async (course: Course) => {
    setBusyId(course.id)
    setActionError('')
    try {
      await api.approveCourse(course.id)
      load()
    } catch (e) {
      setActionError(`${course.name}: ${errorMessage(e)}`)
    } finally {
      setBusyId(null)
    }
  }

  const remove = (course: Course) =>
    modal.confirm({
      title: `Delete "${course.name}"?`,
      content: 'This submission has never gone live, so nothing else references it.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        setActionError('')
        try {
          await api.deleteCourse(course.id)
          load()
        } catch (e) {
          setActionError(`${course.name}: ${errorMessage(e)}`)
        }
      },
    })

  const saveEdit = async (data: Partial<CourseInput>) => {
    if (!editing) return
    await api.updateCourse(editing.id, data)
    load()
  }

  if (error) return <ErrorBlock message={error} onRetry={load} />
  if (!courses) return <LoadingBlock />

  const draftCount = courses.filter((c) => c.approvalStatus === 'draft').length
  const pendingCount = courses.filter((c) => c.approvalStatus === 'pending').length
  const rejectedCount = courses.filter((c) => c.approvalStatus === 'rejected').length

  return (
    <div>
      <div className={`row row-cols-2 ${isSuper ? '' : 'row-cols-md-3'} g-3 mb-4`}>
        {!isSuper && (
          <div className="col">
            <StatCard icon={<Pencil size={20} />} label="Draft" value={draftCount} tone="slate" />
          </div>
        )}
        <div className="col">
          <StatCard icon={<ClipboardCheck size={20} />} label="Awaiting Approval" value={pendingCount} tone="amber" />
        </div>
        <div className="col">
          <StatCard icon={<XCircle size={20} />} label="Rejected" value={rejectedCount} tone="red" />
        </div>
      </div>

      {actionError && (
        <Notice tone="error" onDismiss={() => setActionError('')}>
          {actionError}
        </Notice>
      )}

      <ListCard>
        <DataTable<Course>
          rowKey="id"
          dataSource={courses}
          locale={{
            emptyText: isSuper ? 'Nothing is waiting for approval right now.' : 'You have no draft, pending, or rejected course submissions.',
          }}
          columns={[
            { title: 'Course', dataIndex: 'name', render: (n: string) => <span className="fw-semibold">{n}</span> },
            { title: 'Category', dataIndex: 'category' },
            { title: 'Price', dataIndex: 'price', render: (p: number) => (p > 0 ? `₹${p.toLocaleString('en-IN')}` : 'Free') },
            ...(isSuper ? [{ title: 'Submitted By', dataIndex: 'createdByName', render: (n: string | null) => n ?? '—' }] : []),
            {
              title: 'Status',
              dataIndex: 'approvalStatus',
              render: (st: Course['approvalStatus'], c: Course) => (
                <div>
                  <Badge tone={statusTone[st]}>{st}</Badge>
                  {c.rejectionReason && (
                    <div className="mt-1" style={{ fontSize: 11, color: '#9b87b5', maxWidth: 220 }}>
                      {c.rejectionReason}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, c: Course) =>
                isSuper ? (
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(c)} title="Preview course" tone="purple" />
                    <IconButton icon={<CheckCircle2 size={14} />} onClick={() => void approve(c)} title="Approve" tone="green" disabled={busyId === c.id} />
                    <IconButton icon={<XCircle size={14} />} onClick={() => setRejecting(c)} title="Reject" tone="red" disabled={busyId === c.id} />
                  </div>
                ) : (
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(c)} title="Preview course" tone="purple" />
                    <IconButton icon={<Pencil size={14} />} onClick={() => setEditing(c)} title="Edit and resubmit" tone="blue" />
                    <IconButton icon={<Trash2 size={14} />} onClick={() => remove(c)} title="Delete" tone="red" />
                  </div>
                ),
            },
          ]}
        />
      </ListCard>

      {editing && <ManualCourseModal course={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
      {previewing && <CoursePreviewModal course={previewing} onClose={() => setPreviewing(null)} />}
      {rejecting && (
        <RejectReasonModal
          course={rejecting}
          onClose={() => setRejecting(null)}
          onRejected={() => {
            setRejecting(null)
            load()
          }}
        />
      )}
    </div>
  )
}
