import { Award } from 'lucide-react'
import { Button } from 'antd'
import { Modal } from '../ui/Modal'
import { CertificateSheet } from '../courses/CertificateModal'
import type { CertificateTemplate, IssuedCertificate } from '../../api'

/** A sample certificate rendered from a template (placeholder learner, course and score), so its look can be checked before use. */
export function CertificateTemplatePreviewModal({ template, onClose }: { template: CertificateTemplate; onClose: () => void }) {
  const enabled = template.signatureDetails.filter((s) => s.enabled && s.title.trim())
  const sample: IssuedCertificate = {
    id: 0,
    number: 'KAN-0000-SAMPLE',
    userId: 0,
    learnerName: 'Learner Name',
    courseId: 0,
    courseName: 'Sample Course Title',
    score: 92,
    issuedAt: new Date().toISOString(),
    validUntil: null,
    design: { logo: template.logo, backgroundImage: template.backgroundImage, colors: template.colors, signatures: enabled.map((s) => s.title) },
  }
  return (
    <Modal title={template.name} subtitle="Certificate preview" onClose={onClose} size="lg" tone="brand" icon={<Award size={20} />}>
      {/* Same popup size as the add / edit forms; the certificate sits in the middle, the button at the bottom. */}
      <div className="d-flex flex-column" style={{ minHeight: 'min(678px, calc(100vh - 240px))' }}>
        <div className="my-auto">
          <CertificateSheet cert={sample} titleText={template.titleText} introText={template.introText} signers={enabled} showScore={template.showPassScore} />
          <p className="mt-2 mb-0 small" style={{ color: '#9b87b5' }}>Sample values are shown for the learner, course, score and certificate number.</p>
        </div>
        <div className="d-flex justify-content-end gap-3 pt-3 border-top">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
