import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import '../../pages/CreateTenant.css'

/** The horizontal step tracker used by the Create / Edit tenant wizards: a numbered circle with its name (and
 *  "Current step" / "Completed" beneath), the steps joined by lines that fill with the brand colour as the
 *  steps are completed. `current` is 1-based. */
export function WizardSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="wz-steps" aria-label="Progress">
      {steps.map((label, i) => {
        const n = i + 1
        const state = n < current ? 'is-done' : n === current ? 'is-current' : 'is-todo'
        return (
          <li key={label} className={`wz-step ${state}`} aria-current={n === current ? 'step' : undefined}>
            <span className="wz-dot">{n < current ? <Check size={18} strokeWidth={3} /> : n}</span>
            <span className="wz-step-text">
              <span className="wz-step-label">{label}</span>
              {n <= current && <span className="wz-step-caption">{n === current ? 'Current step' : 'Completed'}</span>}
            </span>
            {i < steps.length - 1 && <span className={`wz-line${n < current ? ' is-done' : ''}`} />}
          </li>
        )
      })}
    </ol>
  )
}

/** Big page title with the "* Required fields" note on the right. */
export function WizardTitleRow({ title }: { title: string }) {
  return (
    <div className="wz-title-row">
      <h2 className="font-display wz-title">{title}</h2>
      <span className="wz-required-note">
        <span style={{ color: '#5c2d91' }}>*</span> Required fields
      </span>
    </div>
  )
}

/** One block of the step-1 form: icon, heading and a short description on the left, the fields on the right. */
export function FormSection({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className="wz-section">
      <div className="wz-section-intro">
        <span className="wz-section-icon">{icon}</span>
        <h3 className="wz-section-title">{title}</h3>
        <p className="wz-section-desc">{description}</p>
      </div>
      <div className="wz-section-fields">{children}</div>
    </section>
  )
}
