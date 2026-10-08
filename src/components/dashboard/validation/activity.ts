import { Building2, ClipboardList, FileText, LogIn, PauseCircle, UploadCloud, Users, XCircle, type LucideIcon } from 'lucide-react'

export type ActivityTone = 'green' | 'amber' | 'red' | 'indigo' | 'purple' | 'blue' | 'slate'

export const activityChip: Record<ActivityTone, { bg: string; text: string }> = {
  green: { bg: '#dcfce7', text: '#16a34a' },
  amber: { bg: '#fef3c7', text: '#d97706' },
  red: { bg: '#fee2e2', text: '#dc2626' },
  indigo: { bg: '#eef2ff', text: '#4f46e5' },
  purple: { bg: '#f0e8fa', text: '#5c2d91' },
  blue: { bg: '#dbeafe', text: '#2563eb' },
  slate: { bg: '#f1f5f9', text: '#64748b' },
}

/** Audit-log actions are free-form strings from the backend; infer an icon + color category from keywords in them. */
export function activityLook(action: string): { icon: LucideIcon; tone: ActivityTone } {
  const a = action.toLowerCase()
  if (a.includes('suspend')) return { icon: PauseCircle, tone: 'amber' }
  if (a.includes('fail') || a.includes('delete') || a.includes('expire')) return { icon: XCircle, tone: 'red' }
  if (a.includes('login') || a.includes('auth')) return { icon: LogIn, tone: 'blue' }
  if (a.includes('upload') || a.includes('scorm')) return { icon: UploadCloud, tone: 'indigo' }
  if (a.includes('plan')) return { icon: ClipboardList, tone: 'indigo' }
  if (a.includes('user')) return { icon: Users, tone: 'purple' }
  if (a.includes('tenant') || a.includes('activat') || a.includes('creat') || a.includes('new')) return { icon: Building2, tone: 'green' }
  return { icon: FileText, tone: 'slate' }
}
