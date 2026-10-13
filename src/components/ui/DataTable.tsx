import { useState } from 'react'
import { Table } from 'antd'
import type { TableProps } from 'antd'

/**
 * The app's one table (Ant Design Table), styled like the Tenants table (`tenant-table`): compact rows,
 * 10 per page with a footer (total on the left, page buttons on the right), horizontal scroll on narrow
 * screens, left-aligned header + cells (a column can still set its own `align`), and a leading "#" row
 * number column that keeps counting across pages. Pass `serial={false}` to omit the "#" column (it is also
 * omitted automatically for un-paged tables). Put it in a `<ListCard>` under a `<Toolbar>` for the standard
 * list look.
 */
export function DataTable<T extends object>({
  pageSize = 10,
  columns,
  pagination,
  serial,
  ...props
}: TableProps<T> & { pageSize?: number; serial?: boolean }) {
  const [page, setPage] = useState(1)
  const paged = pagination !== false
  const pager = pagination === false ? undefined : pagination
  const size = pager?.pageSize ?? pageSize
  const current = pager?.current ?? page
  const showSerial = serial ?? (paged && props.size !== 'small')

  const serialColumn = {
    title: 'S.No',
    key: '__serial',
    width: 92,
    render: (_: unknown, __: T, i: number) => <span className="tenant-muted">{(current - 1) * size + i + 1}</span>,
  }

  // The Actions column is centered (header and buttons); everything else stays left-aligned.
  const withActions = (cols: typeof columns) =>
    cols?.map((col) => ('title' in col && col.title === 'Actions' ? { ...col, className: `${col.className ?? ''} col-center`.trim() } : col))

  const allColumns = withActions(showSerial ? [serialColumn, ...(columns ?? [])] : columns)

  return (
    <Table<T>
      className="tenant-table"
      size="middle"
      // Fixed layout: columns keep their size when rows change (filters, paging), so headers never shift.
      // Columns without a `width` share the remaining space equally; the table scrolls sideways below ~150px a column.
      tableLayout="fixed"
      scroll={{ x: Math.max(720, (allColumns?.length ?? 5) * 150) }}
      pagination={
        paged
          ? {
              pageSize: size,
              hideOnSinglePage: false,
              showSizeChanger: false,
              showTotal: (total) => `${total} ${total === 1 ? 'item' : 'items'}`,
              ...pager,
              onChange: (p, s) => {
                setPage(p)
                pager?.onChange?.(p, s)
              },
            }
          : false
      }
      columns={allColumns}
      {...props}
    />
  )
}
