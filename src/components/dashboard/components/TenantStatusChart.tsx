import { useState } from 'react'
import { Select } from 'antd'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { api } from '../../../api'
import { useApi } from '../../../api/useApi'

type Range = '1m' | '6m' | '1y'

const RANGES: { value: Range; label: string; caption: string }[] = [
  { value: '1m', label: 'Last 1 month', caption: 'Last 1 month' },
  { value: '6m', label: 'Last 6 months', caption: 'Last 6 months' },
  { value: '1y', label: 'Last 1 year', caption: 'Last 1 year' },
]

export function TenantStatusChart({ totalTenants }: { totalTenants: number }) {
  const [range, setRange] = useState<Range>('1m')
  const { data, loading } = useApi(() => api.tenantStatusTrend(range), [range])
  const caption = RANGES.find((r) => r.value === range)?.caption

  return (
    <Card className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h3 className="font-value fw-semibold mb-0" style={{ fontSize: 14, color: '#1a1228' }}>
            Tenant Status Over Time
          </h3>
          <p className="mb-0" style={{ fontSize: 11, color: '#9b87b5', marginTop: 2 }}>
            {caption} — Active, Suspended, Expired
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Select size="small" value={range} onChange={setRange} options={RANGES.map(({ value, label }) => ({ value, label }))} style={{ width: 140 }} />
          <Badge tone="purple">{totalTenants} Total</Badge>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240} style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 150ms' }}>
        <AreaChart data={data ?? []}>
          <defs>
            <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradSuspended" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D97706" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradExpired" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DC2626" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0E8FA" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9B87B5' }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9B87B5' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1.5px solid #EDE8F5', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="Active" name="Active" stroke="#16A34A" strokeWidth={2.5} fill="url(#gradActive)" />
          <Area type="monotone" dataKey="Suspended" name="Suspended" stroke="#D97706" strokeWidth={2.5} fill="url(#gradSuspended)" />
          <Area type="monotone" dataKey="Expired" name="Expired" stroke="#DC2626" strokeWidth={2.5} fill="url(#gradExpired)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
