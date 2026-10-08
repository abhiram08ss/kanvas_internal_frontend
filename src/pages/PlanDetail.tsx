import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Checkbox } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { SearchInput } from '../components/ui/SearchInput'
import { Badge } from '../components/ui/Badge'
import { Notice } from '../components/ui/State'
import { errorMessage } from '../api'
import { useData, useDataNeeds } from '../context/DataContext'

export default function PlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { plans, courses, updatePlanCourses } = useData()
  useDataNeeds('plans', 'courses')
  const plan = plans.find((p) => p.id === Number(id))

  const [selected, setSelected] = useState<number[]>(plan?.includedFreeCourseIds ?? [])
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setSelected(plan?.includedFreeCourseIds ?? [])
  }, [plan?.id])

  if (!plan) {
    return (
      <AppLayout title="Manage Plan" subtitle="Plan not found">
        <p className="text-secondary">This plan does not exist.</p>
        <Button type="link" onClick={() => navigate('/plans')} className="p-0 mt-3">
          Back to Plans
        </Button>
      </AppLayout>
    )
  }

  // An Inactive course can't be newly included here - provisioning only ever assigns Active courses to a
  // tenant anyway (see the backend's provisioning step), so an Inactive one would sit here "selected" but
  // never actually delivered. One already selected before it was deactivated still shows, so it can be
  // reviewed and unchecked rather than silently vanishing from the list.
  const freeCourses = courses.filter(
    (c) => c.type === 'Free' && (c.status === 'Active' || selected.includes(c.id)) && c.name.toLowerCase().includes(query.toLowerCase()),
  )

  const toggle = (courseId: number) => {
    setSelected((prev) => (prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]))
  }

  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...(plan.includedFreeCourseIds ?? [])].sort())

  return (
    <AppLayout title={`Manage Plan – ${plan.name}`} subtitle="Included Free Courses">
      <Button type="text" icon={<ArrowLeft size={16} />} onClick={() => navigate('/plans')} className="mb-3">
        Back to Plans
      </Button>

      <Card className="p-4">
        <div className="mb-3 d-flex align-items-center justify-content-between">
          <div>
            <h3 className="font-display fs-5 fw-bold text-dark mb-0">Included Free Courses</h3>
            <p className="small text-secondary mb-0">Only free courses can be included. These are automatically available to tenants on this plan.</p>
          </div>
          <Badge tone="purple">
            Selected: {selected.length} / {courses.filter((c) => c.type === 'Free').length} free courses
          </Badge>
        </div>

        {saveError && (
          <Notice tone="error" onDismiss={() => setSaveError('')}>
            {saveError}
          </Notice>
        )}

        <div className="mb-3" style={{ maxWidth: 384 }}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search free courses..." />
        </div>

        <div className="rounded-2 border">
          {freeCourses.map((course, i) => (
            <label key={course.id} className={`d-flex align-items-center gap-3 px-3 py-2 mb-0 ${i > 0 ? 'border-top' : ''}`} style={{ cursor: 'pointer' }}>
              <Checkbox checked={selected.includes(course.id)} onChange={() => toggle(course.id)} />
              <span className="flex-grow-1 small fw-medium text-dark">{course.name}</span>
              {course.status === 'Inactive' && <Badge tone="slate">INACTIVE</Badge>}
              <Badge tone="green">FREE</Badge>
            </label>
          ))}
          {freeCourses.length === 0 && <p className="px-3 py-4 text-center small text-secondary mb-0">No free courses found.</p>}
        </div>

        <div className="mt-4 d-flex justify-content-end gap-3">
          <Button onClick={() => navigate('/plans')}>Cancel</Button>
          <Button
            type="primary"
            disabled={!dirty || saving}
            onClick={async () => {
              setSaving(true)
              setSaveError('')
              try {
                await updatePlanCourses(plan.id, selected)
                navigate('/plans')
              } catch (e) {
                setSaveError(errorMessage(e))
                setSaving(false)
              }
            }}
          >
            {saving ? 'Saving…' : 'Save Selection'}
          </Button>
        </div>
      </Card>
    </AppLayout>
  )
}
