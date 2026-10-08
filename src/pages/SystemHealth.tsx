import { Alert, Button, Col, Empty, Row } from 'antd'
import { RefreshCcw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ErrorBlock, LoadingBlock } from '../components/ui/State'
import { api } from '../api'
import { useApi } from '../api/useApi'

export default function SystemHealth() {
  const { data, error, loading, reload } = useApi(api.health)

  return (
    <AppLayout title="System Health" subtitle="App, DB, LMS connectivity, storage, background services">
      {loading && !data ? (
        <LoadingBlock label="Running health checks…" />
      ) : error || !data ? (
        <ErrorBlock message={error ?? 'No data'} onRetry={reload} />
      ) : (
        <>
          <div className="mb-4 d-flex align-items-center justify-content-between">
            <div>
              <h2 className="font-display fs-5 fw-bold mb-0" style={{ color: '#1a1228' }}>
                System Health
              </h2>
              <p className="small mb-0" style={{ color: '#7b6b94' }}>
                App, DB, LMS connectivity, storage, background services
              </p>
            </div>
            <Button icon={<RefreshCcw size={15} className={loading ? 'spin' : ''} />} onClick={reload} disabled={loading}>
              Refresh
            </Button>
          </div>

          {data.degradedCount > 0 && (
            <Alert
              className="mb-4"
              type="warning"
              showIcon
              title={`${data.degradedCount} Service(s) Degraded`}
              description={`${data.healthyCount} of ${data.services.length} services healthy · Last checked: just now`}
            />
          )}

          <Row gutter={[16, 16]}>
            {data.services.map((s) => (
              <Col key={s.key} xs={24} sm={12} lg={8}>
                <Card className="p-4 h-100" style={{ height: '100%' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2 fs-5">
                      <span>{s.icon}</span>
                      <p className="small fw-semibold mb-0" style={{ color: '#1a1228' }}>
                        {s.name}
                      </p>
                    </div>
                    <Badge>{s.status}</Badge>
                  </div>
                  <div className="mt-3 d-flex align-items-center justify-content-between small">
                    <div>
                      <p className="mb-0" style={{ color: '#9b87b5' }}>
                        Latency
                      </p>
                      <p className="fw-semibold mb-0" style={{ color: '#1a1228' }}>
                        {s.latency}
                      </p>
                    </div>
                    <div>
                      <p className="mb-0" style={{ color: '#9b87b5' }}>
                        Uptime
                      </p>
                      <p className="fw-semibold mb-0" style={{ color: '#16a34a' }}>
                        {s.uptime}
                      </p>
                    </div>
                  </div>
                  {s.detail && (
                    <p className="mt-2 mb-0" style={{ fontSize: 12, color: '#b45309' }}>
                      {s.detail}
                    </p>
                  )}
                  {s.simulated && (
                    <p className="mt-2 fst-italic mb-0" style={{ fontSize: 12, color: '#9b87b5' }}>
                      Simulated check — no live integration configured
                    </p>
                  )}
                </Card>
              </Col>
            ))}
          </Row>

          <Card className="mt-4 p-4">
            <h3 className="mb-3 font-display fs-6 fw-bold" style={{ color: '#1a1228' }}>
              Response Time (Last 24h)
            </h3>
            {data.responseTime.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No samples yet — the backend records one every few minutes." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.responseTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e8fa" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#9b87b5' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9b87b5' }} axisLine={false} tickLine={false} unit="ms" />
                  <Tooltip />
                  <Line type="monotone" dataKey="ms" stroke="#5c2d91" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="mt-4 p-4">
            <h3 className="mb-3 font-display fs-6 fw-bold" style={{ color: '#1a1228' }}>
              Recent Incidents
            </h3>
            {data.incidents.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No incidents recorded." />
            ) : (
              <div>
                {data.incidents.map((incident, i) => (
                  <div
                    key={incident.service + incident.date}
                    className="d-flex align-items-center justify-content-between gap-3 py-3"
                    style={i > 0 ? { borderTop: '1px solid #ede8f5' } : undefined}
                  >
                    <div>
                      <p className="fw-semibold mb-0" style={{ color: '#1a1228' }}>
                        {incident.service}
                      </p>
                      <p className="small mb-0" style={{ color: '#7b6b94' }}>
                        {incident.detail}
                      </p>
                      <p className="mb-0" style={{ fontSize: 12, color: '#9b87b5' }}>
                        {incident.date}
                      </p>
                    </div>
                    <Badge>{incident.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </AppLayout>
  )
}
