import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import '../../pages/CreateTenant.css'

/** The horizontal step tracker used by the Create / Edit tenant wizards: a numbered circle with its name (and
 *  "Current step" / "Completed" beneath), the steps joined by lines that fill with the brand colour as the
 *  steps are completed. `current` is 1-based. */
export function WizardSteps({
  steps,
  current,
  captions,
  onStepClick,
  variant = 'line',
  jumpAnywhere = false,
}: {
  steps: string[]
  current: number
  captions?: string[]
  /** When given, every step is a button that jumps to that step (1-based). */
  onStepClick?: (step: number) => void
  /** 'chevron': arrow-shaped segments. 'meter': labelled segments of one bar. 'line': numbered circles joined by lines. */
  variant?: 'line' | 'meter' | 'chevron' | 'dots'
  /** Edit pages: every step (also the ones ahead) can be clicked, not only the finished ones. */
  jumpAnywhere?: boolean
}) {
  const clickable = !!onStepClick
  if (variant === 'dots') {
    return (
      <ol className="wz-dots" aria-label="Progress">
        {steps.map((label, i) => {
          const n = i + 1
          const state = n < current ? 'is-done' : n === current ? 'is-current' : 'is-todo'
          const caption = n < current ? `Completed${clickable ? ' · Edit' : ''}` : (captions?.[i] ?? '')
          const canJump = clickable && (jumpAnywhere || n < current) && n !== current
          const body = (
            <>
              <span className="wz-dots-circle">{n < current ? <Check size={15} strokeWidth={3} /> : n}</span>
              <span className="wz-dots-text">
                <span className="wz-dots-label">{label}</span>
                {caption && <span className="wz-dots-caption">{caption}</span>}
              </span>
            </>
          )
          return (
            <li key={label} className={`wz-dots-step ${state}`} aria-current={n === current ? 'step' : undefined}>
              {canJump ? (
                <button type="button" className="wz-dots-head is-link" onClick={() => onStepClick?.(n)}>
                  {body}
                </button>
              ) : (
                <div className="wz-dots-head">{body}</div>
              )}
              {i < steps.length - 1 && <span className="wz-dots-line" />}
            </li>
          )
        })}
      </ol>
    )
  }
  if (variant === 'chevron') {
    return (
      <ol className="wz-chev" aria-label="Progress">
        {steps.map((label, i) => {
          const n = i + 1
          const state = n < current ? 'is-done' : n === current ? 'is-current' : 'is-todo'
          const caption = n < current ? `Completed${clickable ? ' · Edit' : ''}` : (captions?.[i] ?? (n === current ? 'Current step' : ''))
          const body = (
            <>
              <span className="wz-chev-num">{n < current ? <Check size={15} strokeWidth={3} /> : n}</span>
              <span className="wz-chev-text">
                <span className="wz-chev-label">{label}</span>
                <span className="wz-chev-caption">{caption}</span>
              </span>
            </>
          )
          return (
            <li key={label} className={`wz-chev-step ${state}${i === 0 ? ' is-first' : ''}`} aria-current={n === current ? 'step' : undefined}>
              {clickable && (jumpAnywhere || n < current) && n !== current ? (
                <button type="button" className="wz-chev-inner is-link" onClick={() => onStepClick?.(n)}>
                  {body}
                </button>
              ) : (
                <div className="wz-chev-inner">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    )
  }
  if (variant === 'meter') {
    return (
      <ol className="wz-meter" aria-label="Progress">
        {steps.map((label, i) => {
          const n = i + 1
          const state = n < current ? 'is-done' : n === current ? 'is-current' : 'is-todo'
          const caption = n < current ? `Completed${clickable ? ' · Edit' : ''}` : (captions?.[i] ?? (n === current ? 'Current step' : ''))
          const body = (
            <>
              <span className="wz-meter-num">{n < current ? <Check size={15} strokeWidth={3} /> : n}</span>
              <span className="wz-meter-text">
                <span className="wz-meter-label">{label}</span>
                <span className="wz-meter-caption">{caption}</span>
              </span>
            </>
          )
          return (
            <li key={label} className={`wz-meter-step ${state}`} aria-current={n === current ? 'step' : undefined}>
              {clickable && n < current ? (
                <button type="button" className="wz-meter-head is-link" onClick={() => onStepClick?.(n)}>
                  {body}
                </button>
              ) : (
                <div className="wz-meter-head">{body}</div>
              )}
              <span className="wz-meter-bar" />
            </li>
          )
        })}
      </ol>
    )
  }
  return (
    <ol className="wz-steps" aria-label="Progress">
      {steps.map((label, i) => {
        const n = i + 1
        const state = n < current ? 'is-done' : n === current ? 'is-current' : 'is-todo'
        return (
          <li key={label} className={`wz-step ${state}`} aria-current={n === current ? 'step' : undefined}>
            {onStepClick ? (
              <button type="button" className="wz-step-btn" onClick={() => onStepClick(n)}>
                <span className="wz-dot">{n < current ? <Check size={18} strokeWidth={3} /> : n}</span>
                <span className="wz-step-text">
                  <span className="wz-step-label">{label}</span>
                  {n < current ? (
                <span className="wz-step-caption is-done">
                  Completed{clickable ? ' · Edit' : ''}
                </span>
              ) : captions?.[i] ? (
                <span className="wz-step-caption">{captions[i]}</span>
              ) : (
                n <= current && <span className="wz-step-caption">Current step</span>
              )}
            </span>
              </button>
            ) : (
              <>
                <span className="wz-dot">{n < current ? <Check size={18} strokeWidth={3} /> : n}</span>
                <span className="wz-step-text">
                  <span className="wz-step-label">{label}</span>
                  {captions?.[i] ? (
                    <span className="wz-step-caption">{captions[i]}</span>
                  ) : (
                    n <= current && <span className="wz-step-caption">{n === current ? 'Current step' : 'Completed'}</span>
                  )}
                </span>
              </>
            )}
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
