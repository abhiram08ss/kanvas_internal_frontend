import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../layout/AppLayout'
import { StatsGrid } from './components/StatsGrid'
import { TenantStatusChart } from './components/TenantStatusChart'
import { RecentActivityTable } from './components/RecentActivityTable'
import { ErrorBlock, LoadingBlock } from '../ui/State'
import { useDashboardData } from './hooks/useDashboardData'
import type { DashboardData } from '../../api'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useDashboardData()

  return (
    <AppLayout title="Dashboard" subtitle="Platform overview — tenants, growth, activity">
      {loading && !data ? (
        <LoadingBlock />
      ) : error || !data ? (
        <ErrorBlock message={error ?? 'No data'} onRetry={reload} />
      ) : (
        <DashboardBody data={data} onViewAll={() => navigate('/audit-logs')} />
      )}
    </AppLayout>
  )
}

function DashboardBody({ data, onViewAll }: { data: DashboardData; onViewAll: () => void }) {
  return (
    <div className="d-flex flex-column gap-4">
      <StatsGrid stats={data.stats} />
      <TenantStatusChart data={data.tenantStatusOverTime} totalTenants={data.stats.totalTenants} />
      <RecentActivityTable rows={data.recentActivity} onViewAll={onViewAll} />
    </div>
  )
}
