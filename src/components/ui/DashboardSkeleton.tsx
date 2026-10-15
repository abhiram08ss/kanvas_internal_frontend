import { KRing } from './KLoader'

const heights = [38, 56, 44, 70, 60, 84, 76, 96, 80, 100]

/** Placeholder with the dashboard's real layout (stat cards + chart) while its data loads. */
export function DashboardSkeleton() {
  return (
    <div className="d-flex flex-column gap-3" aria-busy="true">
      <div><span className="sk-load-pill"><KRing size={16} /> Loading your dashboard…</span></div>
      <div className="row g-3">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="col-6 col-lg-3" key={i}>
            <div className="sk-card">
              <div className="d-flex justify-content-between mb-3">
                <div className="sk" style={{ width: '45%', height: 10 }} />
                <div className="sk" style={{ width: 28, height: 28, borderRadius: 8 }} />
              </div>
              <div className="sk mb-2" style={{ width: 44, height: 22 }} />
              <div className="sk" style={{ width: '60%', height: 8 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="sk-card">
        <div className="d-flex justify-content-between mb-4">
          <div>
            <div className="sk mb-2" style={{ width: 160, height: 12 }} />
            <div className="sk" style={{ width: 110, height: 8 }} />
          </div>
          <div className="sk" style={{ width: 130, height: 28, borderRadius: 14 }} />
        </div>
        <div className="d-flex align-items-end gap-3" style={{ height: 150, borderBottom: '1px solid #ede8f5' }}>
          {heights.map((h, i) => <div key={i} className="sk flex-fill" style={{ height: `${h}%`, borderRadius: '8px 8px 0 0' }} />)}
        </div>
      </div>
    </div>
  )
}
