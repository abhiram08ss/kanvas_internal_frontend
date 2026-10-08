import { api } from '../../../api'
import { useApi } from '../../../api/useApi'

/** Loads the platform dashboard summary (stats, tenant-status trend, recent activity). */
export function useDashboardData() {
  return useApi(api.dashboard)
}
