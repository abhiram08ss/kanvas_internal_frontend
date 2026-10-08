import { useEffect, useState } from 'react'
import { Button, Progress } from 'antd'
import { Award } from 'lucide-react'
import { api, type MyProgress } from '../../api'
import { ResultBadge, formatScore } from './courseResult'
import { CertificateModal } from './CertificateModal'

/**
 * The signed-in user's saved result on a course, straight from the server: how many modules are done,
 * their score against the pass mark, pass/fail, and their certificate once they have earned one.
 * Reloads whenever `refreshKey` changes (the player just saved something).
 */
export function MyProgressPanel({
  packageId,
  refreshKey,
  onData,
}: {
  packageId: string
  refreshKey: number
  /** Called with every fresh result, so the surrounding modal can show the same verdict. */
  onData?: (data: MyProgress) => void
}) {
  const [data, setData] = useState<MyProgress | null>(null)
  const [viewing, setViewing] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .myScormProgress(packageId)
      .then((d) => {
        if (cancelled) return
        setData(d)
        onData?.(d)
      })
      .catch(() => undefined) // the panel is a convenience: the course still plays without it
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId, refreshKey])

  if (!data) return null

  return (
    <div className="mt-3 rounded-3 p-3" style={{ background: '#faf8fe', border: '1px solid #ede8f5' }}>
      <div className="d-flex flex-wrap align-items-center gap-4">
        <div style={{ minWidth: 200, flex: '1 1 200px' }}>
          <div className="d-flex justify-content-between small mb-1" style={{ color: '#7b6b94' }}>
            <span>
              Course progress · {data.modulesFinished} of {data.modulesTotal} module{data.modulesTotal === 1 ? '' : 's'}
            </span>
            <strong style={{ color: '#1a1228' }}>{data.progressPercent}%</strong>
          </div>
          <Progress percent={data.progressPercent} showInfo={false} size="small" status={data.status === 'failed' ? 'exception' : undefined} />
        </div>
        <span className="small" style={{ color: '#7b6b94' }}>
          Score{' '}
          <strong style={{ color: '#1a1228' }}>
            {formatScore(data.score)}
            {data.passScore !== null && <span className="fw-normal"> / pass {data.passScore}%</span>}
          </strong>
        </span>
        <span className="small d-flex align-items-center gap-2" style={{ color: '#7b6b94' }}>
          Result <ResultBadge status={data.status} />
        </span>
        {data.certificateId !== null && (
          // Only while the course is currently passed: a failed (or retaken-and-failed) result locks it.
          <Button
            type="primary"
            size="small"
            icon={<Award size={14} />}
            disabled={data.status !== 'completed'}
            title={data.status !== 'completed' ? `Score at least ${data.passScore ?? 'the pass mark'}% to view your certificate` : undefined}
            onClick={() => setViewing(true)}
          >
            View certificate
          </Button>
        )}
      </div>
      {viewing && data.status === 'completed' && data.certificateId !== null && (
        <CertificateModal certificateId={data.certificateId} onClose={() => setViewing(false)} />
      )}
    </div>
  )
}
