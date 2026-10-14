import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { ModuleBody } from './CoursePreviewModal'
import type { CourseModule } from '../../api'

/** "View" for any module that isn't SCORM (text, image, video, document, hybrid): shows it the way a learner
 *  sees it - the written content and/or the attached file. SCORM modules use ScormPreviewModal instead. */
export function ModulePreviewModal({ module, onClose }: { module: CourseModule; onClose: () => void }) {
  return (
    <Modal title={module.title} subtitle={`${module.course} · module ${module.order}`} onClose={onClose} size="lg" tone="brand">
      {/* Same popup size as the add / edit forms. */}
      <div className="d-flex flex-column" style={{ minHeight: 'min(678px, calc(100vh - 240px))' }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Badge tone="purple">{module.type}</Badge>
        <Badge>{module.status}</Badge>
        {module.duration && <span className="small text-secondary">{module.duration}</span>}
      </div>
      <div className="module-preview-body">
        <ModuleBody module={module} />
      </div>
      </div>
    </Modal>
  )
}
