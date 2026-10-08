import type { ReactNode } from 'react'

/** A labelled form field: label (with a red * when required), the control, then a hint or an error line. */
export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label className="d-block mb-1 fw-semibold" style={{ fontSize: 13, color: '#1a1228' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
      {error ? (
        <div className="mt-1" style={{ fontSize: 12, color: '#dc2626' }}>
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
