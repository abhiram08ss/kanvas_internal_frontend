import { useEffect, useId, useRef, useState } from 'react'
import { Button } from 'antd'
import { Award, Printer } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { ErrorBlock, LoadingBlock } from '../ui/State'
import { api, errorMessage, type IssuedCertificate } from '../../api'
import { formatDate } from './courseResult'
import { isLogoImage, logoImageUrl, resolveLogo, useDefaultLogo } from '../lms-content/logoImage'
import { CornerWave, GOLD, Laurel, Seal } from './certificateSheetParts'

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
  /** Signature slots with the signatory's name (shown above the line); defaults to the design's titles. */
  signers?: { title: string; name: string }[]
  showScore?: boolean
}) {
  const { defaultLogo } = useDefaultLogo()
  const uid = useId().replace(/:/g, '')
  const logo = resolveLogo(cert.design.logo, defaultLogo)
  const [primary, accent, background] = cert.design.colors.length >= 3 ? cert.design.colors : DEFAULT_COLORS
  const signatures = cert.design.signatures.length ? cert.design.signatures : ['Authorized Signatory']
  const slots = signers && signers.length ? signers : signatures.map((title) => ({ title, name: '' }))
  const customBackground = !!cert.design.backgroundImage
  const serif = "'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif"
  const ink = '#2b1650'
  const u = (n: number) => `${n}cqw`

  // "Certificate of Completion": capitalised words in small caps, with the small joining words ("of") shrunk.
  const titleWords = (titleText || 'Certificate of Completion').toLowerCase().split(/\s+/).filter(Boolean)
  const smallWords = new Set(['of', 'and', 'for', 'the', 'in'])

  return (
    <div style={{ background, padding: u(0.8), fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", color: ink }}>
      <div
        style={{
          containerType: 'inline-size',
          position: 'relative',
          width: '100%',
          aspectRatio: '1.414 / 1',
          overflow: 'hidden',
          boxSizing: 'border-box',
          background: customBackground ? `#fff url(${logoImageUrl(cert.design.backgroundImage!)}) center / cover no-repeat` : 'linear-gradient(180deg, #ffffff, #fbf9ff)',
        }}
      >
        {!customBackground && (
          <>
            <CornerWave id={`${uid}w1`} color={primary} style={{ top: 0, left: 0 }} />
            <CornerWave id={`${uid}w2`} color={primary} style={{ bottom: 0, right: 0, transform: 'rotate(180deg)' }} />
            <Laurel color={primary} style={{ left: u(6.5), top: u(24.5) }} />
            <Laurel color={primary} flip style={{ right: u(6.5), top: u(24.5) }} />
          </>
        )}

        {/* double frame with corner stars */}
        <div style={{ position: 'absolute', inset: u(1.7), border: `${u(0.28)} solid ${primary}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: u(2.5), border: `${u(0.1)} solid ${primary}`, pointerEvents: 'none' }} />
        {[{ top: u(0.7), left: u(0.9) }, { top: u(0.7), right: u(0.9) }, { bottom: u(0.7), left: u(0.9) }, { bottom: u(0.7), right: u(0.9) }].map((pos, i) => (
          <span key={i} style={{ position: 'absolute', ...pos, fontSize: u(2.6), lineHeight: 1, color: primary }}>✦</span>
        ))}

        {/* content */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: u(5.6) }}>
          {isLogoImage(logo) ? (
            <img src={logoImageUrl(logo)} alt="Logo" style={{ maxHeight: u(8), maxWidth: u(32), objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: u(1.8), letterSpacing: u(0.5), textTransform: 'uppercase', color: accent, fontWeight: 700 }}>{logo}</div>
          )}

          <h2 style={{ margin: `${u(2.4)} 0 0`, fontFamily: serif, fontVariant: 'small-caps', fontSize: u(6), fontWeight: 700, color: primary, letterSpacing: '0.01em', lineHeight: 1.1 }}>
            {titleWords.map((w, i) =>
              smallWords.has(w) ? (
                <span key={i} style={{ fontSize: '0.5em', textTransform: 'uppercase', margin: '0 0.35em', fontVariant: 'normal' }}>{w}</span>
              ) : (
                <span key={i}>{w.charAt(0).toUpperCase() + w.slice(1)}{i < titleWords.length - 1 ? ' ' : ''}</span>
              ),
            )}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: u(1), width: u(38), margin: `${u(1.5)} 0 ${u(2.2)}` }}>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${primary})` }} />
            <span style={{ width: u(1.5), height: u(1.5), background: GOLD, transform: 'rotate(45deg)' }} />
            <span style={{ flex: 1, height: 1, background: `linear-gradient(270deg, transparent, ${primary})` }} />
          </div>

          <p style={{ margin: 0, fontSize: u(1.45), letterSpacing: u(0.42), textTransform: 'uppercase', color: '#5b5578', fontWeight: 500 }}>
            {introText || 'This certificate is proudly presented to'}
          </p>

          <p style={{ margin: `${u(2.4)} 0 0`, minWidth: u(58), padding: `0 ${u(2)} ${u(0.6)}`, borderBottom: `${u(0.12)} solid ${ink}`, fontFamily: serif, fontSize: u(4), fontWeight: 700, fontStyle: 'italic', color: ink, lineHeight: 1.2 }}>
            {cert.learnerName}
          </p>

          <p style={{ margin: `${u(2.4)} 0 0`, fontFamily: serif, fontSize: u(2.1), color: ink }}>for successfully completing the course</p>
          <p style={{ margin: `${u(1)} 0 0`, fontFamily: serif, fontSize: u(2.5), fontWeight: 700, color: primary }}>
            <span style={{ fontWeight: 400, color: ink }}>“</span>
            <span style={{ borderBottom: `${u(0.1)} solid ${ink}`, padding: `0 ${u(1.4)}` }}>{cert.courseName}</span>
            <span style={{ fontWeight: 400, color: ink }}>”</span>
          </p>
          <p style={{ margin: `${u(1.2)} 0 0`, fontFamily: serif, fontSize: u(2.1), color: ink }}>
            on <span style={{ borderBottom: `${u(0.1)} solid ${ink}`, padding: `0 ${u(1.2)}` }}>{formatDate(cert.issuedAt)}</span>.
          </p>
          {showScore && cert.score !== null && (
            <p style={{ margin: `${u(0.8)} 0 0`, fontFamily: serif, fontSize: u(1.8), color: '#5b5578' }}>
              with a score of <strong>{Number.isInteger(cert.score) ? cert.score : cert.score.toFixed(1)}%</strong>
            </p>
          )}
        </div>

        {/* signatures */}
        <div style={{ position: 'absolute', left: u(14), right: u(21), bottom: u(8.6), display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}>
          {slots.map((sg, i) => (
            <div key={sg.title + i} style={{ display: 'flex', alignItems: 'stretch', flex: '0 1 auto' }}>
              {i > 0 && <span style={{ width: 1, background: '#b9afd0', margin: `0 ${u(4.5)}` }} />}
              <div style={{ width: u(21), textAlign: 'center' }}>
                <div style={{ minHeight: u(2.6), fontFamily: serif, fontStyle: 'italic', fontSize: u(1.9), color: ink }}>{sg.name}</div>
                <div style={{ borderTop: `${u(0.1)} solid ${ink}`, paddingTop: u(0.8), fontFamily: serif, fontSize: u(1.6), color: ink }}>{sg.title}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ position: 'absolute', left: 0, right: 0, bottom: u(4.1), margin: 0, textAlign: 'center', fontSize: u(1.05), color: '#8b82a3', letterSpacing: '0.02em' }}>
          Certificate No. <strong>{cert.number}</strong>
          {cert.validUntil ? ` · Valid until ${formatDate(cert.validUntil)}` : ''}
        </p>

        <Seal id={`${uid}s`} ribbon={primary} style={{ right: u(7), bottom: u(6.2) }} />
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
