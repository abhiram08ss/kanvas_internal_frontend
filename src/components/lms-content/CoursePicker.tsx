import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Empty, Menu, Select } from 'antd'
import { Card } from '../ui/Card'
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
    <Card className="p-3" style={{ width: 280, flexShrink: 0, borderRadius: 14, borderColor: '#ede8f5' }}>
      <p className="mb-2 d-flex align-items-center gap-2 small fw-bold text-dark">
        <BookOpen size={14} color="#5c2d91" /> Course
        <span
          className="fw-semibold"
          style={{ color: '#5c2d91', background: '#f1e9fb', borderRadius: 999, padding: '0 8px', fontSize: 11, lineHeight: '18px' }}
        >
          {rows.length}
        </span>
      </p>
      <div className="d-flex flex-column gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search courses..." />
        <Select
          value={category}
          onChange={setCategory}
          options={[{ value: 'All', label: 'All categories' }, ...courseOptions.categoryTypes.map((c) => ({ value: c, label: c }))]}
          style={{ width: '100%' }}
        />
      </div>
      <div className="mt-2">
        {rows.length > 0 ? (
          <Menu
            mode="inline"
            selectedKeys={selectedId !== null ? [String(selectedId)] : []}
            onClick={({ key }) => onSelect(Number(key))}
            items={rows.map((c) => ({ key: String(c.id), label: c.name }))}
            style={{ border: 0, background: 'transparent' }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No courses match." />
        )}
      </div>
    </Card>
  )
}
