import { AlertTriangle, CheckCircle2, PauseCircle } from 'lucide-react'
import { Input, Select } from 'antd'

export type TenantStatusChoice = 'Active' | 'Suspended'

export const SUSPEND_REASONS = ['Payment overdue', 'Policy violation', 'Requested by customer', 'Security concern', 'Other']

/** The text written to the audit log for a suspension: the chosen reason, plus the optional note. */
export const suspendReasonText = (reason: string, note: string) => (note.trim() ? `${reason} — ${note.trim()}` : reason).slice(0, 300)

/**
 * "Tenant status" panel of the Create / Edit tenant pages: an Active / Suspended switch. Choosing Suspended asks
 * for a reason (required) and an optional note; both end up in the audit log next to the suspension.
 */
export function TenantStatusCard({
  status,
  onStatusChange,
  reason,
  onReasonChange,
  note,
  onNoteChange,
  reasonError,
}: {
  status: TenantStatusChoice
  onStatusChange: (s: TenantStatusChoice) => void
  reason: string
  onReasonChange: (r: string) => void
  note: string
  onNoteChange: (n: string) => void
  reasonError?: string
}) {
  const suspended = status === 'Suspended'
  return (
    <div className="tc-status">
      <div className="tc-status-head">
        <span className="tc-preview-label" style={{ margin: 0 }}>
          Tenant status
        </span>
        <span className={`tc-status-badge${suspended ? ' is-suspended' : ''}`}>
          <i /> {status}
        </span>
      </div>

      <div className="tc-status-switch" role="radiogroup" aria-label="Tenant status">
        <button type="button" role="radio" aria-checked={!suspended} className={!suspended ? 'is-on' : ''} onClick={() => onStatusChange('Active')}>
          <CheckCircle2 size={15} /> Active
        </button>
        <button type="button" role="radio" aria-checked={suspended} className={suspended ? 'is-on is-suspended' : ''} onClick={() => onStatusChange('Suspended')}>
          <PauseCircle size={15} /> Suspended
        </button>
      </div>

      {suspended && (
        <>
          <div className="tc-status-warn">
            <AlertTriangle size={16} />
            <p>
              The tenant will be moved to <strong>Suspended</strong> status. Select a reason below. You can switch it back to <strong>Active</strong> at any time.
            </p>
          </div>
          <label className="tc-status-label" data-field-error={reasonError ? '' : undefined}>
            Reason <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <Select
            value={reason || undefined}
            onChange={onReasonChange}
            placeholder="Select a reason for suspending"
            status={reasonError ? 'error' : undefined}
            options={SUSPEND_REASONS.map((r) => ({ value: r, label: r }))}
            style={{ width: '100%' }}
          />
          {reasonError && <div className="tc-status-error">{reasonError}</div>}
          <label className="tc-status-label">
            Note <span className="tc-opt">(optional)</span>
          </label>
          <Input.TextArea rows={3} maxLength={200} value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="Add a note (visible in the audit log)" />
        </>
      )}
    </div>
  )
}
