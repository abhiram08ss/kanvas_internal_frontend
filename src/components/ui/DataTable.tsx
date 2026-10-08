import { Table } from 'antd'
import type { TableProps } from 'antd'

/**
 * The app's one table (Ant Design Table): compact rows, 10 per page (pager hidden when everything fits),
 * horizontal scroll on narrow screens, every header + cell centered by default (a column can still opt
 * out with its own `align`). Put it in a `<ListCard>` under a `<Toolbar>` for the standard list look.
 */
export function DataTable<T extends object>({ pageSize = 10, columns, ...props }: TableProps<T> & { pageSize?: number }) {
  const centeredColumns = columns?.map((col) => ({ align: 'center' as const, ...col }))
  return (
    <Table<T>
      size="middle"
      scroll={{ x: 'max-content' }}
      pagination={{ pageSize, hideOnSinglePage: true, showSizeChanger: false }}
      columns={centeredColumns}
      {...props}
    />
  )
}
