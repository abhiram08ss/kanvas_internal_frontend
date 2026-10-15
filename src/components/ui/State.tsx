import type { ReactNode } from 'react'
import { Alert, Button, Result } from 'antd'
import { KLoader } from './KLoader'

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="kloader-block" role="status" aria-live="polite">
      <KLoader size="md" />
      <strong>{label}</strong>
      <small>This usually takes a few seconds</small>
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Result
      status="error"
      title="Could not load data"
      subTitle={message}
      extra={
        onRetry && (
          <Button type="primary" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  )
}

/** Inline banner for action results: `error` for failures, `success` for confirmations. */
export function Notice({ tone, children, onDismiss }: { tone: 'error' | 'success'; children: ReactNode; onDismiss?: () => void }) {
  return <Alert type={tone} showIcon title={children} closable={onDismiss ? { onClose: onDismiss } : false} className="mb-4" />
}
