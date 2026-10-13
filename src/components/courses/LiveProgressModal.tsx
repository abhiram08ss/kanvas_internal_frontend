import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Users } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { DataTable } from '../ui/DataTable'
import { watchLiveProgress, type Course, type LiveProgressEvent } from '../../api'

const statusTone = (s: string) =>
  s === 'passed' || s === 'completed' ? 'green' : s === 'failed' ? 'red' : s === 'incomplete' || s === 'browsed' ? 'amber' : 'slate'

function relativeTime(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

/**
 * Watches a course's SCORM progress live: every learner currently in it, updating on screen the moment
 * they move (no refresh) via a Server-Sent Events connection - see api/client.ts::watchLiveProgress.
 */
export function LiveProgressModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, LiveProgressEvent>>({})
  const [status, setStatus] = useState<'connecting' | 'open' | 'error'>('connecting')
  const [justUpdated, setJustUpdated] = useState<Set<string>>(new Set())
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timers = flashTimers.current
    const stop = watchLiveProgress(
      course.scormPackage!,
      (event) => {
        const key = `${event.userId}:${event.scoId}`
        setRows((prev) => ({ ...prev, [key]: event }))
        setJustUpdated((prev) => new Set(prev).add(key))
        clearTimeout(timers[key])
        timers[key] = setTimeout(() => {
          setJustUpdated((prev) => {
            const next = new Set(prev)
            next.delete(key)
            return next
          })
        }, 1500)
      },
      setStatus,
    )
    return () => {
      stop()
      Object.values(timers).forEach(clearTimeout)
    }
  }, [course.scormPackage])

  // Keeps "Updated Xs ago" ticking even when nothing new has arrived.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const list = useMemo(() => Object.entries(rows).sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt)), [rows])
  const showModuleColumn = list.some(([, r]) => r.moduleTitle)

  return (
    <Modal title="Live Progress" subtitle={course.name} onClose={onClose} size="lg" tone="brand" icon={<Activity size={20} />}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <span className="d-flex align-items-center gap-2 small fw-semibold" style={{ color: '#7b6b94' }}>
          <Users size={14} /> {list.length} {list.length === 1 ? 'learner' : 'learners'}
        </span>
        <span className="d-flex align-items-center gap-2 small fw-semibold">
          <span
            className="rounded-circle"
            style={{
              width: 8,
              height: 8,
              background: status === 'open' ? '#16a34a' : status === 'connecting' ? '#d97706' : '#dc2626',
              animation: status === 'open' ? 'kanvas-live-pulse 1.4s ease-in-out infinite' : undefined,
            }}
          />
          {status === 'open' ? 'Live' : status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
        </span>
      </div>

      <DataTable<[string, LiveProgressEvent]>
        rowKey={([key]) => key}
        dataSource={list}
        pagination={false}
        locale={{ emptyText: 'No one has started this course yet.' }}
        onRow={([key]) => ({ style: { transition: 'background-color 1.5s', backgroundColor: justUpdated.has(key) ? '#f6f4fd' : undefined } })}
        columns={[
          { title: 'Learner', key: 'learner', render: (_: unknown, [, r]) => <span className="tenant-name">{r.userName}</span> },
          ...(showModuleColumn
            ? [
                {
                  title: 'Module',
                  key: 'module',
                  render: (_: unknown, [, r]: [string, LiveProgressEvent]) => <span className="tenant-muted">{r.moduleTitle ?? '—'}</span>,
                },
              ]
            : []),
          { title: 'Status', key: 'status', render: (_: unknown, [, r]) => <Badge tone={statusTone(r.lessonStatus)}>{r.lessonStatus}</Badge> },
          { title: 'Score', key: 'score', render: (_: unknown, [, r]) => r.scoreRaw || '—' },
          { title: 'Location', key: 'location', render: (_: unknown, [, r]) => <span className="tenant-muted">{r.lessonLocation || '—'}</span> },
          { title: 'Updated', key: 'updated', render: (_: unknown, [, r]) => <span className="tenant-muted">{relativeTime(r.updatedAt, now)}</span> },
        ]}
      />

      <style>{`@keyframes kanvas-live-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </Modal>
  )
}
