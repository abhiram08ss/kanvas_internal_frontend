import { AppLayout } from '../layout/AppLayout'
import { StatsGrid } from './components/StatsGrid'
import { TenantStatusChart } from './components/TenantStatusChart'
import { ErrorBlock, LoadingBlock } from '../ui/State'
import { useDashboardData } from './hooks/useDashboardData'
import type { DashboardData } from '../../api'

export function DashboardPage() {
  const { data, error, loading, reload } = useDashboardData()

  return (
    <AppLayout title="Dashboard" subtitle="Platform overview — tenants and growth">
      {loading && !data ? (
        <LoadingBlock />
      ) : error || !data ? (
        <ErrorBlock message={error ?? 'No data'} onRetry={reload} />
      ) : (
        <DashboardBody data={data} />
      )}
    </AppLayout>
  )
}

function DashboardBody({ data }: { data: DashboardData }) {
  return (
    <div className="d-flex flex-column gap-4">
      <StatsGrid stats={data.stats} />
      <TenantStatusChart totalTenants={data.stats.totalTenants} />
    </div>
  )
}
