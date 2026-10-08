import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Login from './pages/Login'
import { DashboardPage } from './components/dashboard/DashboardPage'
import Tenants from './pages/Tenants'
import CreateTenant from './pages/CreateTenant'
import Plans from './pages/Plans'
import PlanDetail from './pages/PlanDetail'
import Courses from './pages/Courses'
import CourseCategories from './pages/CourseCategories'
import Approvals from './pages/Approvals'
import LmsContent from './pages/LmsContent'
import Provisioning from './pages/Provisioning'
import Subscription from './pages/Subscription'
import UsageAnalytics from './pages/UsageAnalytics'
import PlatformUsers from './pages/PlatformUsers'
import AuditLogs from './pages/AuditLogs'
import SystemHealth from './pages/SystemHealth'
import Settings from './pages/Settings'
import { LoadingBlock } from './components/ui/State'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading)
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '100vh', backgroundColor: '#f7f6fc' }}>
        <LoadingBlock label="Restoring your session…" />
      </div>
    )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// A Support Admin can only create/edit their own courses; a page that is entirely a Super Admin action
// (nothing to view read-only) redirects rather than letting them fill it in and hit a 403 at the end.
function RequireSuperAdmin({ children, fallback }: { children: React.ReactNode; fallback: string }) {
  const { user } = useAuth()
  if (user?.role !== 'Super Admin') return <Navigate to={fallback} replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tenants"
        element={
          <RequireAuth>
            <Tenants />
          </RequireAuth>
        }
      />
      <Route
        path="/tenants/new"
        element={
          <RequireAuth>
            <RequireSuperAdmin fallback="/tenants">
              <CreateTenant />
            </RequireSuperAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/plans"
        element={
          <RequireAuth>
            <Plans />
          </RequireAuth>
        }
      />
      <Route
        path="/plans/:id"
        element={
          <RequireAuth>
            <PlanDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/courses"
        element={
          <RequireAuth>
            <Courses />
          </RequireAuth>
        }
      />
      <Route
        path="/approvals"
        element={
          <RequireAuth>
            <Approvals />
          </RequireAuth>
        }
      />
      <Route
        path="/course-categories"
        element={
          <RequireAuth>
            <CourseCategories />
          </RequireAuth>
        }
      />
      <Route
        path="/lms-content"
        element={
          <RequireAuth>
            <LmsContent />
          </RequireAuth>
        }
      />
      <Route
        path="/provisioning"
        element={
          <RequireAuth>
            <Provisioning />
          </RequireAuth>
        }
      />
      <Route
        path="/subscription"
        element={
          <RequireAuth>
            <Subscription />
          </RequireAuth>
        }
      />
      <Route
        path="/usage-analytics"
        element={
          <RequireAuth>
            <UsageAnalytics />
          </RequireAuth>
        }
      />
      <Route
        path="/platform-users"
        element={
          <RequireAuth>
            <PlatformUsers />
          </RequireAuth>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <RequireAuth>
            <AuditLogs />
          </RequireAuth>
        }
      />
      <Route
        path="/system-health"
        element={
          <RequireAuth>
            <SystemHealth />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Settings />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  )
}
