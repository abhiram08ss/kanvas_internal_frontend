import type { ReactNode } from 'react'
import { Alert, Button, Result, Spin } from 'antd'

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="d-flex align-items-center justify-content-center py-5">
      <Spin description={label} size="large">
        <div style={{ padding: '32px 64px' }} />
      </Spin>
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
