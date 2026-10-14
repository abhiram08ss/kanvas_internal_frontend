import { BookOpen, Layers, Tag } from 'lucide-react'
import type { Course } from '../../api'

/** Header card above the Modules / Quiz Questions lists: the selected course's category, its name and how many items it has. */
export function CourseSummary({ course, count, noun }: { course: Course | undefined; count: number; noun: string }) {
  const items = [
    { label: 'Category', value: course ? course.category : 'All categories', icon: <Tag size={16} />, grow: 2, tint: '#f3effb', color: '#7c3fc0' },
    { label: 'Course', value: course ? course.name : 'All courses', icon: <BookOpen size={16} />, grow: 4, tint: '#e8f0fe', color: '#2563eb' },
    { label: `${noun}s`, value: String(count), icon: <Layers size={16} />, grow: 1.2, tint: '#e7f7ee', color: '#16a34a' },
  ]
  return (
    <div
      className="course-summary d-flex align-items-stretch mb-3 flex-shrink-0"
      style={{ borderRadius: 16, background: 'linear-gradient(135deg, #ffffff 0%, #faf7ff 100%)', border: '1px solid #e9e1f6', boxShadow: '0 2px 8px rgba(80, 40, 140, 0.06)', overflow: 'hidden' }}
    >
      {items.map((it, i) => (
        <div
          key={it.label}
          className="d-flex align-items-center gap-3"
          style={{ flex: `${it.grow} 1 0`, minWidth: 0, padding: '10px 18px', borderLeft: i ? '1px solid #eee7f8' : undefined }}
        >
          <div
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 34, height: 34, borderRadius: 10, background: it.tint, color: it.color }}
          >
            {it.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: '#9b87b5', fontWeight: 600 }}>{it.label}</div>
            <div className="fw-bold text-truncate" style={{ fontSize: 14, lineHeight: 1.3, color: '#1a1228' }} title={it.value}>
              {it.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
