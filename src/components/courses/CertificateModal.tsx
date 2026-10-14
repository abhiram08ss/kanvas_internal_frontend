import { useEffect, useRef, useState } from 'react'
import { Button } from 'antd'
import { Award, Printer } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { ErrorBlock, LoadingBlock } from '../ui/State'
import { api, errorMessage, type IssuedCertificate } from '../../api'
import { formatDate } from './courseResult'
import { isLogoImage, logoImageUrl, resolveLogo, useDefaultLogo } from '../lms-content/logoImage'

const DEFAULT_COLORS = ['#5C2D91', '#7B3FA0', '#F5F4F8']

/** The certificate itself. Inline styles only, so its HTML can be copied into a print window as-is.
 * Exported so a course-wide preview (CoursePreviewModal) can render a sample certificate before anyone
 * has actually earned one - same renderer, just fed a placeholder `IssuedCertificate`-shaped object. */
export function CertificateSheet({
  cert,
  titleText,
  introText,
  signers,
  showScore = true,
}: {
  cert: IssuedCertificate
  /** Template wording; the standard text is used when left out. */
  titleText?: string
  introText?: string
  /** Signature slots with the signatory's name (shown under the title); defaults to the design's titles. */
  signers?: { title: string; name: string }[]
  showScore?: boolean
}) {
  const { defaultLogo } = useDefaultLogo()
  const logo = resolveLogo(cert.design.logo, defaultLogo)
  const [primary, accent, background] = cert.design.colors.length >= 3 ? cert.design.colors : DEFAULT_COLORS
  const signatures = cert.design.signatures.length ? cert.design.signatures : ['Kanvas LMS']

  return (
    <div style={{ background, padding: 12, fontFamily: "'Inter', Arial, sans-serif", color: '#1a1228' }}>
      <div
        style={{
          border: `4px double ${primary}`,
          padding: '36px 40px',
          textAlign: 'center',
          background: cert.design.backgroundImage ? `#fff url(${logoImageUrl(cert.design.backgroundImage)}) center / cover no-repeat` : '#fff',
        }}
      >
        {isLogoImage(logo) ? (
          <img src={logoImageUrl(logo)} alt="Logo" style={{ maxHeight: 56, maxWidth: 220, objectFit: 'contain' }} />
        ) : (
          <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: accent, fontWeight: 700 }}>{logo}</div>
        )}
        <h2 style={{ margin: '14px 0 4px', fontSize: 32, color: primary, fontWeight: 800 }}>{titleText || 'Certificate of Completion'}</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#7b6b94' }}>{introText || 'This is to certify that'}</p>
        <p style={{ margin: '14px 0', fontSize: 30, fontWeight: 700, borderBottom: `2px solid ${accent}`, display: 'inline-block', padding: '0 24px 6px' }}>
          {cert.learnerName}
        </p>
        <p style={{ margin: '4px 0', fontSize: 14, color: '#7b6b94' }}>has successfully completed the course</p>
        <p style={{ margin: '8px 0', fontSize: 22, fontWeight: 700, color: primary }}>{cert.courseName}</p>
        {showScore && cert.score !== null && (
          <p style={{ margin: '4px 0', fontSize: 14 }}>
            with a score of <strong>{Number.isInteger(cert.score) ? cert.score : cert.score.toFixed(1)}%</strong>
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-around', gap: 24, marginTop: 36, flexWrap: 'wrap' }}>
          {(signers && signers.length ? signers : signatures.map((title) => ({ title, name: '' }))).map((sg) => (
            <div key={sg.title} style={{ minWidth: 140 }}>
              <div style={{ minHeight: 18, fontSize: 14, fontStyle: 'italic', color: '#3d3450' }}>{sg.name}</div>
              <div style={{ borderTop: '1px solid #9b87b5', paddingTop: 6, fontSize: 13, fontWeight: 600 }}>{sg.title}</div>
              <div style={{ fontSize: 11, color: '#9b87b5' }}>Authorised signatory</div>
            </div>
          ))}
        </div>

        <p style={{ margin: '28px 0 0', fontSize: 12, color: '#7b6b94' }}>
          Issued {formatDate(cert.issuedAt)}
          {cert.validUntil ? ` · Valid until ${formatDate(cert.validUntil)}` : ''} · Certificate No. <strong>{cert.number}</strong>
        </p>
      </div>
    </div>
  )
}

/** Shows one issued certificate (fetched by id) with a print / save-as-PDF button. */
export function CertificateModal({ certificateId, onClose }: { certificateId: number; onClose: () => void }) {
  const [cert, setCert] = useState<IssuedCertificate | null>(null)
  const [error, setError] = useState('')
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    api
      .certificate(certificateId)
      .then((c) => !cancelled && setCert(c))
      .catch((e) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [certificateId])

  const print = () => {
    const html = sheetRef.current?.innerHTML
    const win = window.open('', '_blank', 'width=1000,height=720')
    if (!html || !win) return
    win.document.write(`<!doctype html><title>Certificate ${cert?.number ?? ''}</title><style>@page{size:landscape;margin:12mm}body{margin:0}</style>${html}`)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <Modal title="Certificate" subtitle={cert ? cert.number : undefined} onClose={onClose} size="lg" tone="brand" icon={<Award size={20} />}>
      {error ? (
        <ErrorBlock message={error} />
      ) : !cert ? (
        <LoadingBlock label="Loading certificate…" />
      ) : (
        <>
          <div ref={sheetRef}>
            <CertificateSheet cert={cert} />
          </div>
          <div className="d-flex justify-content-end gap-3 mt-3">
            <Button onClick={onClose}>Close</Button>
            <Button type="primary" icon={<Printer size={14} />} onClick={print}>
              Print / Save as PDF
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
