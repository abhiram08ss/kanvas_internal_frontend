import { useEffect, useState } from 'react'
import { Input } from 'antd'
import { confirmDialog } from './confirmOptions'

const MIN_LENGTH = 3

function ReasonField({ label, bridge }: { label: string; bridge: { value: string; setError: (m: string) => void } }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    bridge.setError = setError
  }, [bridge])
  return (
    <div className="mt-2">
      <label className="d-block mb-1 fw-semibold" style={{ fontSize: 13, color: '#1a1228' }}>
        {label} <span className="kv-req">*</span>
      </label>
      <Input.TextArea
        autoFocus
        rows={3}
        maxLength={300}
        showCount
        status={error ? 'error' : undefined}
        placeholder="Write a short explanation"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          bridge.value = e.target.value
          if (error) setError('')
        }}
      />
      {error && (
        <div className="mt-1" style={{ fontSize: 12, color: '#dc2626' }}>
          {error}
        </div>
      )}
    </div>
  )
}

/**
 * A confirmation popup that also asks for a written reason (required). The reason is handed to `onOk`; the
 * server writes it into the audit log next to the action. The popup stays open until a reason is entered.
 */
export function reasonDialog({
  title,
  content,
  okText,
  onOk,
  label = 'Reason for deactivating',
}: {
  title: string
  content: string
  okText: string
  /** Label above the box, e.g. "Reason for suspending". */
  label?: string
  onOk: (reason: string) => Promise<void> | void
}) {
  const bridge = { value: '', setError: (_: string) => {} }
  confirmDialog({
    title,
    content: (
      <div>
        <div>{content}</div>
        <ReasonField label={label} bridge={bridge} />
      </div>
    ),
    okText,
    okButtonProps: { danger: true },
    onOk: () => {
      const reason = bridge.value.trim()
      if (reason.length < MIN_LENGTH) {
        bridge.setError(`Please enter a reason (at least ${MIN_LENGTH} characters).`)
        return Promise.reject(new Error('reason required'))
      }
      return onOk(reason)
    },
  })
}
