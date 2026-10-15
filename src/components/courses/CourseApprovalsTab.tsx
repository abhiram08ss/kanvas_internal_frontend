import { useEffect, useState } from 'react'
import { App, Button, Input, Popover } from 'antd'
import { CheckCircle2, ClipboardCheck, Eye, Info, Layers, Pencil, Trash2, XCircle } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { ListCard } from '../ui/ListCard'
import { DataTable } from '../ui/DataTable'
import { StatCard } from '../ui/StatCard'
import { IconButton } from '../ui/IconButton'
import { ErrorBlock, LoadingBlock, Notice } from '../ui/State'
import { Modal } from '../ui/Modal'
import { confirmDialog } from '../ui/confirmOptions'
import { Field } from '../ui/Field'
import { Toolbar } from '../ui/Toolbar'
import { useFitRows } from '../ui/useFitRows'
import { ManualCourseModal } from './ManualCourseModal'
import { CoursePreviewModal } from '../lms-content/CoursePreviewModal'
import { useAuth } from '../../context/AuthContext'
import { useDataNeeds } from '../../context/DataContext'
import { api, errorMessage, type Course, type CourseInput } from '../../api'

const statusFilters = ['All', 'Draft', 'Pending', 'Rejected'] as const
const statusTone = { draft: 'slate', pending: 'amber', rejected: 'red', approved: 'green' } as const

const formatWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

/** "Rejected (i)": hover or click the badge to read why - the reason, who reviewed it, when, and who it went back to. */
function RejectedBadge({ course }: { course: Course }) {
  const when = formatWhen(course.approvedAt)
  const content = (
    <div className="rj-card">
      <div className="rj-head"><XCircle size={13} /> Rejection reason</div>
      <div className="rj-reason">{course.rejectionReason}</div>
      <div className="rj-meta">
        <div>By <strong>{course.approvedByName ?? 'a Super Admin'}</strong></div>
        {when && <div className="rj-when">{when}</div>}
        {course.createdByName && <div>Sent back to <strong>{course.createdByName}</strong></div>}
      </div>
    </div>
  )
  return (
    <Popover content={content} trigger={['hover', 'click']} placement="bottomLeft" arrow overlayClassName="rj-popover">
      <span className="rj-badge" tabIndex={0}>
        <span className="rj-dot" /> Rejected <Info size={13} />
      </span>
    </Popover>
  )
}

function RejectReasonModal({ course, onClose, onRejected }: { course: Course; onClose: () => void; onRejected: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!reason.trim()) {
      setError('A reason is required so the creator knows what to fix.')
      return
    }
    if (reason.trim().length < 3) {
      setError('Please write a little more so the creator knows what to fix.')
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
          <Input.TextArea rows={3} maxLength={500} showCount value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} placeholder="Enter rejection reason" />
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
  const { notification } = App.useApp()
  // CoursePreviewModal reads these from useData() itself - loaded here so Preview has them ready.
  useDataNeeds('courseModules', 'quizQuestions', 'certificateTemplates')

  const [courses, setCourses] = useState<Course[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState<Course | null>(null)
  const [rejecting, setRejecting] = useState<Course | null>(null)
  const [previewing, setPreviewing] = useState<Course | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>('All')
  const pageSize = useFitRows(540)

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
      notification.success({ title: 'Course Approved', description: course.name })
      load()
    } catch (e) {
      notification.error({ title: 'Could Not Approve', description: `${course.name}: ${errorMessage(e)}` })
      setActionError(`${course.name}: ${errorMessage(e)}`)
      load() // it may already have been approved or changed by someone else
    } finally {
      setBusyId(null)
    }
  }

  const confirmApprove = (course: Course) =>
    confirmDialog({
      title: 'Approve Course?',
      content: `Are you sure you want to approve ${course.name}?`,
      okText: 'Approve Course',
      onOk: () => approve(course),
    })

  const remove = (course: Course) =>
    confirmDialog({
      title: 'Delete Course?',
      content: `Are you sure you want to delete ${course.name}?`,
      okText: 'Delete Course',
      okButtonProps: { danger: true },
      onOk: async () => {
        setActionError('')
        try {
          await api.deleteCourse(course.id)
          notification.success({ title: 'Course Deleted', description: course.name })
          load()
        } catch (e) {
          notification.error({ title: 'Could Not Delete', description: `${course.name}: ${errorMessage(e)}` })
          setActionError(`${course.name}: ${errorMessage(e)}`)
          load()
        }
      },
    })

  const saveEdit = async (data: Partial<CourseInput>) => {
    if (!editing) return
    await api.updateCourse(editing.id, data)
    notification.success({ title: 'Course Updated', description: editing.name })
    load()
  }

  if (error) return <ErrorBlock message={error} onRetry={load} />
  if (!courses) return <LoadingBlock />

  const needle = query.trim().toLowerCase()
  const rows = courses.filter(
    (c) =>
      (filter === 'All' || c.approvalStatus === filter.toLowerCase()) &&
      (!needle || c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle) || (c.createdByName ?? '').toLowerCase().includes(needle)),
  )
  const draftCount = courses.filter((c) => c.approvalStatus === 'draft').length
  const pendingCount = courses.filter((c) => c.approvalStatus === 'pending').length
  const rejectedCount = courses.filter((c) => c.approvalStatus === 'rejected').length

  return (
    <div>
      <div className={`row row-cols-2 ${isSuper && draftCount === 0 ? 'row-cols-md-3' : 'row-cols-md-4'} g-3 mb-4`}>
        <div className="col">
          <StatCard icon={<Layers size={20} />} label="All" value={courses.length} hint="all submissions" tone="purple" />
        </div>
        {(!isSuper || draftCount > 0) && (
          <div className="col">
            <StatCard icon={<Pencil size={20} />} label="Draft" value={draftCount} hint="not yet submitted" tone="slate" />
          </div>
        )}
        <div className="col">
          <StatCard icon={<ClipboardCheck size={20} />} label="Awaiting Approval" value={pendingCount} hint="needs review" tone="amber" />
        </div>
        <div className="col">
          <StatCard icon={<XCircle size={20} />} label="Rejected" value={rejectedCount} hint="sent back to creator" tone="red" />
        </div>
      </div>

      {actionError && (
        <Notice tone="error" onDismiss={() => setActionError('')}>
          {actionError}
        </Notice>
      )}

      <ListCard>
        <Toolbar query={query} onQueryChange={setQuery} searchPlaceholder="Search by course, code or creator" filters={statusFilters} activeFilter={filter} onFilterChange={setFilter} />
        <DataTable<Course>
          key={`${filter}|${needle}`}
          serial={false}
          rowKey="id"
          pageSize={pageSize}
          dataSource={rows}
          locale={{
            emptyText:
              courses.length > 0
                ? 'No submissions match your search or filter.'
                : isSuper
                  ? 'Nothing is waiting for approval right now.'
                  : 'You have no draft, pending, or rejected course submissions.',
          }}
          columns={[
            { title: 'Course Name', dataIndex: 'name', render: (n: string) => <span>{n}</span> },
            { title: 'Course Category', width: 190, dataIndex: 'category' },
            { title: 'Course Price', width: 130, dataIndex: 'price', render: (p: number) => (p > 0 ? `₹${p.toLocaleString('en-IN')}` : 'Free') },
            ...(isSuper ? [{ title: 'Submitted By', width: 170, dataIndex: 'createdByName', render: (n: string | null) => n ?? '—' }] : []),
            {
              title: 'Approval Status', width: 190,
              dataIndex: 'approvalStatus',
              render: (st: Course['approvalStatus'], c: Course) =>
                st === 'rejected' && c.rejectionReason ? <RejectedBadge course={c} /> : <Badge tone={statusTone[st]}>{st}</Badge>,
            },
            {
              title: 'Actions', width: 140,
              key: 'actions',
              render: (_: unknown, c: Course) =>
                isSuper && c.approvalStatus !== 'draft' ? (
                  <div className="d-flex align-items-center gap-2">
                    <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(c)} title="Preview course" tone="purple" />
                    <IconButton icon={<CheckCircle2 size={14} />} onClick={() => confirmApprove(c)} title="Approve" tone="green" disabled={busyId === c.id} />
                    {c.approvalStatus !== 'rejected' && (
                      <IconButton icon={<XCircle size={14} />} onClick={() => setRejecting(c)} title="Reject" tone="red" disabled={busyId === c.id} />
                    )}
                  </div>
                ) : (
                  <div className="d-flex align-items-center gap-2">
                    <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(c)} title="Preview course" tone="purple" />
                    {/* A rejected course is read-only for its creator: only Preview, no Edit / Delete. */}
                    {c.approvalStatus !== 'rejected' && (
                      <>
                        <IconButton icon={<Pencil size={14} />} onClick={() => setEditing(c)} title={c.approvalStatus === 'draft' ? 'Edit' : 'Edit and resubmit'} tone="blue" />
                        <IconButton icon={<Trash2 size={14} />} onClick={() => remove(c)} title="Delete" tone="red" />
                      </>
                    )}
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
            notification.success({ title: 'Course Rejected', description: rejecting.name })
            setRejecting(null)
            load()
          }}
        />
      )}
    </div>
  )
}
