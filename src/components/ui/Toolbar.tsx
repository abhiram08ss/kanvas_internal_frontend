import { Search, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Input, Segmented } from 'antd'
import './PillUI.css'

/**
 * The search + filter-pill + "New X" bar that sits on top of every list (Ant Design Input / Segmented /
 * Button), inside a `<ListCard>` with the table below it. Filters and the New button are optional.
 */
export function Toolbar<F extends string>({
  query,
  onQueryChange,
  searchPlaceholder = 'Search...',
  filters,
  activeFilter,
  onFilterChange,
  newLabel,
  onNew,
  newIcon,
  extra,
}: {
  query: string
  onQueryChange: (v: string) => void
  searchPlaceholder?: string
  /** Omit to show no filter pills (e.g. when the list has no natural status field). */
  filters?: readonly F[]
  activeFilter?: F
  onFilterChange?: (f: F) => void
  newLabel?: string
  onNew?: () => void
  newIcon?: ReactNode
  /** Anything else that belongs on the right (extra buttons, a count...). */
  extra?: ReactNode
}) {
  return (
    <div className="pill-toolbar">
      <Input
        allowClear
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={searchPlaceholder}
        prefix={<Search size={14} color="#9b87b5" />}
        style={{ width: 220 }}
      />
      {filters && filters.length > 0 && (
        <Segmented className="pill-filters" options={[...filters]} value={activeFilter} onChange={(v) => onFilterChange?.(v as F)} />
      )}
      <div className="ms-auto d-flex align-items-center gap-2">
        {extra}
        {onNew && (
          <Button type="primary" icon={newIcon ?? <Plus size={14} />} onClick={onNew}>
            {newLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
