import { Input } from 'antd'
import { Search } from 'lucide-react'

export function SearchBox() {
  return <Input allowClear prefix={<Search size={14} color="#9b87b5" />} placeholder="Search..." style={{ width: 220 }} />
}
