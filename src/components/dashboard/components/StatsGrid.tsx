import { Col, Row } from 'antd'
import { Building, CheckCircle2, PauseCircle, Clock, Users, ClipboardList, AlertTriangle, PieChart as PieIcon } from 'lucide-react'
import { StatCard } from '../../ui/StatCard'
import type { DashboardData } from '../../../api'

export function StatsGrid({ stats }: { stats: DashboardData['stats'] }) {
  const cards = [
    { icon: <Building size={20} />, label: 'Total Tenants', value: stats.totalTenants, hint: 'All registered tenants', tone: 'purple' as const },
    { icon: <CheckCircle2 size={20} />, label: 'Active Tenants', value: stats.activeTenants, hint: `${stats.activePercent}% of all tenants`, tone: 'green' as const },
    { icon: <PauseCircle size={20} />, label: 'Suspended Tenants', value: stats.suspendedTenants, hint: 'Temporarily suspended', tone: 'amber' as const },
    { icon: <Clock size={20} />, label: 'Expired Tenants', value: stats.expiredTenants, hint: 'Renewal required', tone: 'red' as const },
    { icon: <Users size={20} />, label: 'Total Users', value: stats.totalUsers, hint: 'Across all tenants', tone: 'blue' as const },
    { icon: <ClipboardList size={20} />, label: 'Active Plans', value: stats.activePlans, hint: 'Currently active plans', tone: 'purple' as const },
    { icon: <AlertTriangle size={20} />, label: 'Provisioning Failures', value: stats.provisioningFailures, hint: 'Require investigation', tone: 'red' as const },
    { icon: <PieIcon size={20} />, label: 'Average Quota Usage', value: `${stats.avgQuotaUsed}%`, hint: 'Across all tenants', tone: 'green' as const },
  ]

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col key={c.label} xs={12} lg={6}>
          <StatCard {...c} />
        </Col>
      ))}
    </Row>
  )
}
