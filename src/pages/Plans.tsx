import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, CheckCircle2, Users2, Check, ChevronRight, Briefcase, Pencil, Plus } from 'lucide-react'
import { Button } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { StatCard } from '../components/ui/StatCard'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { IconButton } from '../components/ui/IconButton'
import { PlanFormModal } from '../components/plans/PlanFormModal'
import { useData, useDataNeeds } from '../context/DataContext'
import type { Plan, PlanInput } from '../api'

export default function Plans() {
  const { plans, addPlan, updatePlan } = useData()
  useDataNeeds('plans')
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | undefined>(undefined)

  const activeCount = plans.filter((p) => p.status === 'Active').length
  const maxUsersLabel = plans.length === 0 ? '—' : plans.some((p) => p.maxUsers === 0) ? 'Unlimited' : Math.max(...plans.map((p) => p.maxUsers))

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (plan: Plan) => {
    setEditing(plan)
    setModalOpen(true)
  }

  // Price/period/limit labels are derived by the server; we only send the editable fields.
  const handleSave = (data: PlanInput) => (editing ? updatePlan(editing.id, data) : addPlan(data))

  return (
    <AppLayout title="Plans" subtitle="Define subscription plans and feature entitlements">
      <div className="row row-cols-1 row-cols-sm-3 g-3">
        <div className="col">
          <StatCard icon={<ClipboardList size={20} />} label="Total Plans" value={plans.length} hint="all plans" tone="purple" />
        </div>
        <div className="col">
          <StatCard icon={<CheckCircle2 size={20} />} label="Active Plans" value={activeCount} hint="available to tenants" tone="green" />
        </div>
        <div className="col">
          <StatCard icon={<Users2 size={20} />} label="Max Users" value={maxUsersLabel} hint="largest plan limit" tone="blue" />
        </div>
      </div>

      <div className="mt-4 d-flex justify-content-end">
        <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
          Create Plan
        </Button>
      </div>

      <div className="mt-4 row row-cols-1 row-cols-lg-3 g-4">
        {plans.map((plan) => (
          <div key={plan.id} className="col">
            <Card className={`position-relative d-flex flex-column h-100 p-4 ${plan.popular ? 'border-primary border-2' : ''}`}>
              {plan.popular && (
                <span className="position-absolute" style={{ top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                  <Badge tone="purple">MOST POPULAR</Badge>
                </span>
              )}
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center justify-content-center rounded-2 bg-primary-subtle text-primary" style={{ width: 44, height: 44 }}>
                  <Briefcase size={20} />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Badge tone="green">{plan.activeCount} active</Badge>
                  <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(plan)} title="Edit plan" tone="blue" />
                </div>
              </div>

              <h3 className="mt-3 font-display fs-4 fw-bold text-dark">{plan.name}</h3>
              <p className="mt-1 small text-secondary">{plan.tagline}</p>

              <div className="mt-3 d-flex align-items-baseline gap-1">
                <span className="font-display fs-2 fw-bold text-dark">{plan.price}</span>
                {plan.period && <span className="small text-secondary">{plan.period}</span>}
              </div>

              <div className="mt-3 d-flex align-items-center gap-4 border-top border-bottom py-2 small text-secondary">
                <span className="d-flex align-items-center gap-2">
                  <Users2 size={14} /> {plan.users}
                </span>
                <span className="d-flex align-items-center gap-2">
                  <ClipboardList size={14} /> {plan.tenants}
                </span>
              </div>

              <ul className="mt-3 flex-grow-1 list-unstyled d-flex flex-column gap-2 mb-0">
                <li className="d-flex align-items-center gap-2 small text-dark">
                  <Check size={15} className="flex-shrink-0 text-success" /> {plan.includedCourseCount} free courses included
                </li>
                {plan.features.map((f) => (
                  <li key={f} className="d-flex align-items-center gap-2 small text-dark">
                    <Check size={15} className="flex-shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>

              <Button className="mt-4" icon={<ChevronRight size={15} />} iconPlacement="end" onClick={() => navigate(`/plans/${plan.id}`)}>
                Manage plan
              </Button>
            </Card>
          </div>
        ))}
      </div>

      {modalOpen && <PlanFormModal plan={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
    </AppLayout>
  )
}
