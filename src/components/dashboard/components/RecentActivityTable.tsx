import { Button } from 'antd'
import { ListCard } from '../../ui/ListCard'
import { DataTable } from '../../ui/DataTable'
import { activityChip, activityLook } from '../validation/activity'
import type { AuditLog } from '../../../api'

export function RecentActivityTable({ rows, onViewAll }: { rows: AuditLog[]; onViewAll: () => void }) {
  return (
    <ListCard>
      <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: '1.5px solid #ede8f5' }}>
        <div>
          <h3 className="font-value fw-semibold mb-0" style={{ fontSize: 14, color: '#1a1228' }}>
            Recent Activity
          </h3>
          <p className="mb-0" style={{ fontSize: 11, color: '#9b87b5', marginTop: 2 }}>
            Platform audit trail
          </p>
        </div>
        <Button size="small" onClick={onViewAll}>
          View All
        </Button>
      </div>

      <DataTable<AuditLog>
        rowKey="id"
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: 'No activity recorded yet.' }}
        columns={[
          {
            title: '',
            key: 'icon',
            width: 56,
            render: (_, row) => {
              const { icon: Icon, tone } = activityLook(row.action)
              const chip = activityChip[tone]
              return (
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{ width: 28, height: 28, borderRadius: 8, background: chip.bg, color: chip.text }}
                >
                  <Icon size={14} />
                </div>
              )
            },
          },
          { title: 'Date & Time', dataIndex: 'date', key: 'date', render: (v: string) => <span style={{ color: '#9b87b5', whiteSpace: 'nowrap' }}>{v}</span> },
          {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            render: (v: string) => (
              <span className="fw-semibold" style={{ background: '#f0e8fa', color: '#5c2d91', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>
                {v}
              </span>
            ),
          },
          { title: 'Performed By', dataIndex: 'performedBy', key: 'performedBy', render: (v: string) => <span style={{ color: '#3d2260' }}>{v}</span> },
          { title: 'Details', dataIndex: 'details', key: 'details', render: (v: string) => <span className="fw-medium">{v}</span> },
          { title: 'IP Address', dataIndex: 'ip', key: 'ip', render: (v: string) => <span style={{ color: '#9b87b5', fontFamily: 'monospace' }}>{v}</span> },
        ]}
      />
    </ListCard>
  )
}
