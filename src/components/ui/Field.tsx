import type { ReactNode } from 'react'

/** A labelled form field: label (with a red * when required), the control, then a hint or an error line. */
export function Field({
  label,
  required,
  error,
  hint,
  grow,
  children,
}: {
  label: ReactNode
  required?: boolean
  error?: string
  hint?: ReactNode
  /** Let the field take the free height of a fixed-height form (its control may then stretch). */
  grow?: boolean
  children: ReactNode
}) {
  return (
    <div className={grow ? 'd-flex flex-column flex-grow-1' : undefined} style={grow ? { minHeight: 0 } : undefined}>
      <label className="d-block mb-1 fw-semibold" style={{ fontSize: 13, color: '#1a1228' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
      {error ? (
        <div className="mt-1" data-field-error style={{ fontSize: 12, color: '#dc2626' }}>
          {error}
        </div>
      ) : (
        hint && (
          <div className="mt-1" style={{ fontSize: 12, color: '#7b6b94' }}>
            {hint}
          </div>
        )
      )}
    </div>
  )
}
