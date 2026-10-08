import { Search } from 'lucide-react'
import { Input } from 'antd'

export function SearchInput({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Input allowClear value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} prefix={<Search size={14} color="#9b87b5" />} />
}
