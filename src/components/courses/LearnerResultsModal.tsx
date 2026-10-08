import { useEffect, useState } from 'react'
import { Button, Progress } from 'antd'
import { Award, BarChart3 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { DataTable } from '../ui/DataTable'
import { ErrorBlock, LoadingBlock } from '../ui/State'
import { api, errorMessage, type Course, type CourseProgress, type ModuleResult } from '../../api'
import { CertificateModal } from './CertificateModal'
import { ResultBadge, formatDateTime, formatScore } from './courseResult'

type Learner = CourseProgress['learners'][number]

const moduleTone = (s: string) =>
  s === 'passed' || s === 'completed' ? 'green' : s === 'failed' ? 'red' : s === 'incomplete' || s === 'browsed' ? 'amber' : 'slate'

const lastActivity = (l: Learner) =>
  l.modules
    .map((m) => m.updatedAt ?? '')
    .sort()
    .at(-1) || null

/** Every learner's saved progress, score, pass/fail and certificate for one course, as the server has it. */
export function LearnerResultsModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const [data, setData] = useState<CourseProgress | null>(null)
  const [error, setError] = useState('')
  const [certificateId, setCertificateId] = useState<number | null>(null)

  const load = () => {
    setError('')
    api
      .scormProgress(course.scormPackage!)
      .then(setData)
      .catch((e) => setError(errorMessage(e)))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [course.scormPackage])

  return (
    <Modal
      title="Learner Results"
      subtitle={data?.passScore != null ? `${course.name} · pass mark ${data.passScore}%` : course.name}
      onClose={onClose}
      size="xl"
      tone="brand"
      icon={<BarChart3 size={20} />}
    >
      {error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : !data ? (
        <LoadingBlock />
      ) : (
        <DataTable<Learner>
          rowKey="userId"
          dataSource={data.learners}
          locale={{ emptyText: 'No one has started this course yet.' }}
          expandable={{
            rowExpandable: (l) => l.modules.length > 0,
            expandedRowRender: (l) => (
              <DataTable<ModuleResult>
                rowKey="scoId"
                size="small"
                pagination={false}
                dataSource={l.modules}
                columns={[
                  { title: 'Module', key: 'title', render: (_, m) => m.moduleTitle ?? data.title },
                  { title: 'Status', key: 'status', render: (_, m) => <Badge tone={moduleTone(m.lessonStatus)}>{m.lessonStatus}</Badge> },
                  { title: 'Score', key: 'score', render: (_, m) => formatScore(m.score) },
                  { title: 'Time spent', dataIndex: 'totalTime', key: 'time' },
                  { title: 'Finished', key: 'done', render: (_, m) => formatDateTime(m.completedAt) },
                ]}
              />
            ),
          }}
          columns={[
            { title: 'Learner', dataIndex: 'userName', key: 'name', render: (n: string) => <span className="fw-semibold">{n}</span> },
            {
              title: 'Progress',
              key: 'progress',
              width: 200,
              render: (_, l) => (
                <div>
                  <Progress percent={l.progressPercent} size="small" showInfo={false} status={l.status === 'failed' ? 'exception' : undefined} />
                  <span style={{ fontSize: 11, color: '#9b87b5' }}>
                    {l.modulesFinished} of {l.modulesTotal} module{l.modulesTotal === 1 ? '' : 's'} · {l.progressPercent}%
                  </span>
                </div>
              ),
            },
            { title: 'Score', key: 'score', render: (_, l) => formatScore(l.score) },
            { title: 'Result', key: 'result', render: (_, l) => <ResultBadge status={l.status} /> },
            {
              title: 'Certificate',
              key: 'cert',
              render: (_, l) =>
                l.certificateId !== null ? (
                  <Button type="link" size="small" icon={<Award size={13} />} onClick={() => setCertificateId(l.certificateId)} style={{ padding: 0 }}>
                    {l.certificateNumber}
                  </Button>
                ) : (
                  <span style={{ color: '#9b87b5' }}>—</span>
                ),
            },
            { title: 'Last activity', key: 'last', render: (_, l) => <span style={{ color: '#9b87b5' }}>{formatDateTime(lastActivity(l))}</span> },
          ]}
        />
      )}
      {certificateId !== null && <CertificateModal certificateId={certificateId} onClose={() => setCertificateId(null)} />}
    </Modal>
  )
}
