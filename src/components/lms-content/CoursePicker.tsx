import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Empty, Select } from 'antd'
import { SearchInput } from '../ui/SearchInput'
import { useData, useDataNeeds } from '../../context/DataContext'
import type { CategoryType, Course } from '../../api'

/** Left-hand "pick a course" card shared by the Modules and Quiz Questions tabs. */
export function CoursePicker({ courses, selectedId, onSelect }: { courses: Course[]; selectedId: number | null; onSelect: (id: number) => void }) {
  const { courseOptions } = useData()
  useDataNeeds('courseOptions')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryType | 'All'>('All')
  const rows = courses.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || c.category === category))

  return (
    <div
      className="p-3 d-flex flex-column course-picker"
      style={{
        width: 280,
        flexShrink: 0,
        borderRadius: 14,
        border: '1px solid #ede8f5',
        background: '#fff',
        overflow: 'hidden',
        height: 'calc(100vh - 210px)',
        minHeight: 320,
      }}
    >
      <p className="mb-2 flex-shrink-0 d-flex align-items-center gap-2 small fw-bold text-dark">
        <BookOpen size={14} color="#5c2d91" /> Course
        <span
          className="fw-semibold"
          style={{ color: '#5c2d91', background: '#f1e9fb', borderRadius: 999, padding: '0 8px', fontSize: 11, lineHeight: '18px' }}
        >
          {rows.length}
        </span>
      </p>
      <div className="d-flex flex-column gap-2 flex-shrink-0">
        <SearchInput value={query} onChange={setQuery} placeholder="Search courses..." />
        <Select
          value={category}
          onChange={setCategory}
          options={[{ value: 'All', label: 'All categories' }, ...courseOptions.categoryTypes.map((c) => ({ value: c, label: c }))]}
          style={{ width: '100%' }}
        />
      </div>
      <div className="mt-3 flex-grow-1 scrollbar-thin" style={{ minHeight: 0, overflowX: 'hidden', overflowY: 'auto' }}>
        {rows.length > 0 ? (
          <ul className="course-picker-list list-unstyled mb-0">
            {rows.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`course-picker-item${c.id === selectedId ? ' is-active' : ''}`}
                  onClick={() => onSelect(c.id)}
                >
                  <span className="name">{c.name}</span>
                  <span className="code">{c.code}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No courses match." />
        )}
      </div>
    </div>
  )
}
