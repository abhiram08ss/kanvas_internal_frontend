import { Badge } from '../ui/Badge'
import type { CourseResult } from '../../api'

const RESULT: Record<CourseResult, { label: string; tone: 'green' | 'red' | 'amber' | 'slate' }> = {
  completed: { label: 'Passed', tone: 'green' },
  failed: { label: 'Failed', tone: 'red' },
  'in progress': { label: 'In progress', tone: 'amber' },
  'not started': { label: 'Not started', tone: 'slate' },
}

/** The course-level outcome the server worked out (all modules done + score against the pass mark). */
export function ResultBadge({ status }: { status: CourseResult }) {
  const { label, tone } = RESULT[status]
  return <Badge tone={tone}>{label}</Badge>
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export const formatScore = (score: number | null | undefined) =>
  score === null || score === undefined ? '—' : `${Number.isInteger(score) ? score : score.toFixed(1)}%`
