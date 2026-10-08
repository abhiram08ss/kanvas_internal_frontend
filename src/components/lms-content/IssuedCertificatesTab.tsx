import { useEffect, useMemo, useState } from 'react'
import { Button } from 'antd'
import { Award, Eye, Users } from 'lucide-react'
import { ListCard } from '../ui/ListCard'
import { DataTable } from '../ui/DataTable'
import { StatCard } from '../ui/StatCard'
import { Toolbar } from '../ui/Toolbar'
import { IconButton } from '../ui/IconButton'
import { ErrorBlock, LoadingBlock } from '../ui/State'
import { CertificateModal } from '../courses/CertificateModal'
import { formatDate, formatScore } from '../courses/courseResult'
import { api, errorMessage, type IssuedCertificate } from '../../api'

/** Certificates issued to learners who finished a course (awarded automatically - see the server's progress rules). */
export function IssuedCertificatesTab() {
  const [certs, setCerts] = useState<IssuedCertificate[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState<number | null>(null)

  const load = () => {
    setError('')
    api
      .certificates()
      .then(setCerts)
      .catch((e) => setError(errorMessage(e)))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const rows = useMemo(() => {
    const q = query.toLowerCase()
    return (certs ?? []).filter((c) => [c.number, c.learnerName, c.courseName].some((v) => v.toLowerCase().includes(q)))
  }, [certs, query])

  if (error) return <ErrorBlock message={error} onRetry={load} />
  if (!certs) return <LoadingBlock />

  return (
    <div>
      <div className="row row-cols-2 g-3 mb-4">
        <div className="col">
          <StatCard icon={<Award size={20} />} label="Certificates Issued" value={certs.length} tone="purple" />
        </div>
        <div className="col">
          <StatCard icon={<Users size={20} />} label="Learners Certified" value={new Set(certs.map((c) => c.userId)).size} tone="green" />
        </div>
      </div>

      <ListCard>
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search by learner, course or number..."
          extra={<Button onClick={load}>Refresh</Button>}
        />
        <DataTable<IssuedCertificate>
          rowKey="id"
          dataSource={rows}
          locale={{ emptyText: 'No certificates issued yet — they are awarded when a learner finishes a course.' }}
          columns={[
            { title: 'Certificate No.', dataIndex: 'number', render: (n: string) => <span className="fw-semibold">{n}</span> },
            { title: 'Learner', dataIndex: 'learnerName' },
            { title: 'Course', dataIndex: 'courseName' },
            { title: 'Score', dataIndex: 'score', render: (s: number | null) => formatScore(s) },
            { title: 'Issued', dataIndex: 'issuedAt', render: (d: string) => formatDate(d) },
            { title: 'Valid Until', dataIndex: 'validUntil', render: (d: string | null) => (d ? formatDate(d) : 'No expiry') },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, c: IssuedCertificate) => (
                <IconButton icon={<Eye size={14} />} onClick={() => setViewing(c.id)} title="View certificate" tone="purple" />
              ),
            },
          ]}
        />
      </ListCard>

      {viewing !== null && <CertificateModal certificateId={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
