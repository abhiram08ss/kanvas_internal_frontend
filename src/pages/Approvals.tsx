import { AppLayout } from '../components/layout/AppLayout'
import { CourseApprovalsTab } from '../components/courses/CourseApprovalsTab'
import { useAuth } from '../context/AuthContext'

export default function Approvals() {
  const { user } = useAuth()
  const isSuper = user?.role === 'Super Admin'

  return (
    <AppLayout
      title="Approvals"
      subtitle={isSuper ? 'Review course submissions from Content Users' : 'Track your submitted courses and their approval status'}
    >
      <CourseApprovalsTab />
    </AppLayout>
  )
}
