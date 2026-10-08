import { useCallback, useEffect, useMemo, useState } from 'react'
import { Award, Check, CheckCircle2, ChevronLeft, ChevronRight, FileText, HelpCircle, Layers, XCircle } from 'lucide-react'
import { Button, Progress } from 'antd'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { CertificateSheet } from '../courses/CertificateModal'
import { ScormPlayer } from '../courses/ScormPreviewModal'
import { useData } from '../../context/DataContext'
import { api, API_ORIGIN, type Course, type CourseModule, type CourseResult } from '../../api'

const DEFAULT_DESIGN = { logo: 'Company Default', colors: ['#5C2D91', '#7B3FA0', '#F5F4F8'], signatures: ['Kanvas LMS'] }
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.ogg'])
const PDF_EXT = new Set(['.pdf'])
const extOf = (name: string) => name.slice(name.lastIndexOf('.')).toLowerCase()

type Selection = { type: 'course-scorm' } | { type: 'module'; id: number } | { type: 'quiz' } | { type: 'certificate' }

/** A module's content, by type - a SCORM module plays inline (no separate launch step). */
function ModuleBody({ module, onProgressSaved }: { module: CourseModule; onProgressSaved?: () => void }) {
  const mediaUrl = module.media ? `${API_ORIGIN}/course-modules/media/${module.media}` : null
  const ext = module.media ? extOf(module.media) : ''

  if (module.type === 'scorm') {
    return module.scormPackage ? (
      <ScormPlayer
        course={{ scormPackage: module.scormPackage, name: module.title, scormTitle: module.scormTitle, launchFile: module.launchFile }}
        onProgressSaved={onProgressSaved}
      />
    ) : (
      <p className="small mb-0" style={{ color: '#9b87b5' }}>
        No SCORM package attached yet.
      </p>
    )
  }

  return (
    <>
      {module.type === 'text' || module.type === 'hybrid' ? (
        module.content ? (
          // eslint-disable-next-line react/no-danger -- authored by admins in this same app's own rich-text editor, not learner input
          <div className="small" style={{ color: '#3d3352' }} dangerouslySetInnerHTML={{ __html: module.content }} />
        ) : (
          <p className="small mb-0" style={{ color: '#9b87b5' }}>
            No content written yet.
          </p>
        )
      ) : null}

      {mediaUrl && (
        <div className={module.type === 'hybrid' ? 'mt-2' : undefined}>
          {module.type === 'image' || IMAGE_EXT.has(ext) ? (
            <img src={mediaUrl} alt="" className="rounded-2 border" style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }} />
          ) : module.type === 'video' || VIDEO_EXT.has(ext) ? (
            <video src={mediaUrl} controls className="rounded-2 border" style={{ maxWidth: '100%', maxHeight: 360 }} />
          ) : PDF_EXT.has(ext) ? (
            <div className="d-flex flex-column gap-2">
              {/* #toolbar=0&navpanes=0 hides the browser's own PDF viewer chrome (Chrome/Edge respect
                  this) - without it, that native toolbar looks jarringly out of place against the rest
                  of this preview's own styling. */}
              <iframe
                src={`${mediaUrl}#toolbar=0&navpanes=0`}
                title={module.title}
                className="w-100 rounded-2"
                style={{ height: 420, border: '1.5px solid #ede8f5' }}
              />
              <a href={mediaUrl} target="_blank" rel="noreferrer" className="small d-flex align-items-center gap-2 align-self-start">
                <FileText size={14} /> Open in new tab
              </a>
            </div>
          ) : (
            // Word/PowerPoint files can't be rendered inline by the browser itself (that needs a viewer
            // service reaching this file over the public internet, which a local/dev deployment can't
            // offer) - a plain open-in-new-tab link is the one option that always works.
            <a href={mediaUrl} target="_blank" rel="noreferrer" className="small d-flex align-items-center gap-2">
              <FileText size={14} /> Open document
            </a>
          )}
        </div>
      )}
    </>
  )
}

/**
 * One full walkthrough of a course, laid out the way a learner would move through it: an outline on the
 * left (every module, the quiz, the certificate), with the selected item's content on the right - a SCORM
 * module or course plays inline here too, instead of needing a separate "Launch" step. Quiz questions are
 * shown for review (correct answers marked), not as an interactive attempt - this is an authoring preview,
 * not a real learner attempt - and the certificate is a sample, using the same renderer as an actually-issued
 * one (CertificateModal's CertificateSheet) with placeholder learner/score values.
 */
export function CoursePreviewModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const { courseModules, quizQuestions, certificateTemplates } = useData()

  const modules = useMemo(() => courseModules.filter((m) => m.courseId === course.id).sort((a, b) => a.order - b.order), [courseModules, course.id])
  const questions = useMemo(() => quizQuestions.filter((q) => q.courseId === course.id), [quizQuestions, course.id])
  const template = certificateTemplates.find((t) => t.name === course.certificateTemplate)
  const hasCourseScorm = modules.length === 0 && !!course.scormPackage

  const [selected, setSelected] = useState<Selection>(
    hasCourseScorm ? { type: 'course-scorm' } : modules.length > 0 ? { type: 'module', id: modules[0].id } : { type: 'quiz' },
  )

  // Every SCORM package in this course (each module's own, or the course's single one), so completing one
  // marks it done in the outline and feeds the overall progress bar - the same way a learner would see it.
  const scormTargets = useMemo(
    () => [
      ...(hasCourseScorm ? [{ key: 'course-scorm', packageId: course.scormPackage! }] : []),
      ...modules.filter((m) => m.type === 'scorm' && m.scormPackage).map((m) => ({ key: `module-${m.id}`, packageId: m.scormPackage! })),
    ],
    [hasCourseScorm, course.scormPackage, modules],
  )
  const [scormStatus, setScormStatus] = useState<Record<string, CourseResult>>({})
  const refreshScormProgress = useCallback(() => {
    for (const t of scormTargets) {
      api
        .myScormProgress(t.packageId)
        .then((d) => setScormStatus((prev) => ({ ...prev, [t.key]: d.status })))
        .catch(() => undefined) // the outline still works without it - just no checkmark for this one
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scormTargets])
  useEffect(refreshScormProgress, [refreshScormProgress])

  const completedCount = scormTargets.filter((t) => scormStatus[t.key] === 'completed').length
  const overallPercent = scormTargets.length > 0 ? Math.round((completedCount / scormTargets.length) * 100) : null

  // The outline's own order, as a flat list - so "Next" can move through SCORM modules one after another
  // the same way a learner would, then on into the quiz and certificate.
  const outlineItems: { selection: Selection; label: string }[] = [
    ...(hasCourseScorm ? [{ selection: { type: 'course-scorm' as const }, label: 'Course Content' }] : []),
    ...modules.map((m) => ({ selection: { type: 'module' as const, id: m.id }, label: m.title })),
    { selection: { type: 'quiz' as const }, label: 'Quiz' },
    { selection: { type: 'certificate' as const }, label: 'Certificate' },
  ]
  const selectionKey = (s: Selection) => (s.type === 'module' ? `module-${s.id}` : s.type)
  const currentIndex = outlineItems.findIndex((item) => selectionKey(item.selection) === selectionKey(selected))
  const previousItem = currentIndex > 0 ? outlineItems[currentIndex - 1] : null
  const nextItem = currentIndex >= 0 && currentIndex < outlineItems.length - 1 ? outlineItems[currentIndex + 1] : null

  const sampleCert = {
    id: 0,
    number: 'PREVIEW',
    userId: 0,
    learnerName: 'Sample Learner',
    courseId: course.id,
    courseName: course.name,
    score: 100,
    issuedAt: new Date().toISOString(),
    validUntil: null,
    design: template ? { logo: template.logo, colors: template.colors, signatures: template.signatures } : DEFAULT_DESIGN,
  }

  const navItemStyle = (active: boolean) => ({
    cursor: 'pointer',
    background: active ? '#f1e9fb' : undefined,
    borderRight: active ? '3px solid #5c2d91' : '3px solid transparent',
  })

  return (
    <Modal
      title={`Preview · ${course.name}`}
      subtitle="Modules, quiz and certificate, in the order a learner meets them"
      onClose={onClose}
      size="full"
      tone="brand"
      icon={<Layers size={20} />}
    >
      <div className="d-flex flex-column gap-4">
        <div className="rounded-3 overflow-hidden" style={{ border: '1.5px solid #ede8f5', background: '#fff' }}>
          {course.coverImage ? (
            <img
              src={`${API_ORIGIN}/courses/covers/${course.coverImage}`}
              alt=""
              className="w-100"
              style={{ height: 140, objectFit: 'contain', background: '#f5f4f8', display: 'block' }}
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center" style={{ height: 100, background: 'linear-gradient(135deg, #5c2d91, #7b3fa0)' }}>
              <Layers size={32} color="#fff" style={{ opacity: 0.45 }} />
            </div>
          )}
          <div className="p-3">
            <h5 className="mb-1 fw-bold" style={{ color: '#1a1228' }}>
              {course.name}
            </h5>
            <div className="d-flex flex-wrap gap-2 mb-2">
              <Badge tone="slate">{course.code}</Badge>
              <Badge tone="purple">{course.category}</Badge>
              {course.level && <Badge tone="blue">{course.level}</Badge>}
              <Badge tone={course.type === 'Free' ? 'green' : 'amber'}>{course.type}</Badge>
            </div>
            {course.description && (
              <p className="small mb-0" style={{ color: '#7b6b94' }}>
                {course.description}
              </p>
            )}
          </div>
        </div>

        {overallPercent !== null && (
          <div className="rounded-3 p-3" style={{ border: '1.5px solid #ede8f5', background: '#fdfcff' }}>
            <div className="d-flex justify-content-between small mb-1" style={{ color: '#7b6b94' }}>
              <span className="fw-semibold" style={{ color: '#1a1228' }}>
                Overall Progress · {completedCount} of {scormTargets.length} module{scormTargets.length === 1 ? '' : 's'}
              </span>
              <strong style={{ color: '#1a1228' }}>{overallPercent}%</strong>
            </div>
            <Progress percent={overallPercent} showInfo={false} strokeColor="#5c2d91" />
          </div>
        )}

        {course.learningOutcomes.length > 0 && (
          <div className="rounded-3 p-3" style={{ border: '1.5px solid #ede8f5', background: '#fdfcff', boxShadow: '0 6px 18px rgba(92,45,145,0.07)' }}>
            <h6 className="fw-bold mb-3" style={{ color: '#1a1228' }}>
              What you&apos;ll learn
            </h6>
            <div className="row g-2">
              {course.learningOutcomes.map((outcome, i) => (
                <div key={i} className="col-md-6 d-flex align-items-start gap-2 small">
                  <Check size={16} className="flex-shrink-0 mt-1" style={{ color: '#16a34a' }} />
                  <span style={{ color: '#3d3352' }}>{outcome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="row g-0 rounded-3 overflow-hidden" style={{ border: '1.5px solid #ede8f5', height: '73vh' }}>
          <div
            className="h-100 d-flex flex-column flex-shrink-0"
            style={{ width: 280, borderRight: '1.5px solid #ede8f5', background: '#fdfcff' }}
          >
            <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid #ede8f5' }}>
              <div className="fw-bold" style={{ color: '#1a1228' }}>
                Course Outline
              </div>
              <div className="small" style={{ color: '#9b87b5' }}>
                {hasCourseScorm ? 1 : modules.length} module{(hasCourseScorm ? 1 : modules.length) === 1 ? '' : 's'} + quiz + certificate
              </div>
            </div>
            <div className="flex-grow-1" style={{ overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
              {hasCourseScorm && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected({ type: 'course-scorm' })}
                  className="d-flex align-items-center gap-2 px-3 py-2 small fw-semibold"
                  style={navItemStyle(selected.type === 'course-scorm')}
                >
                  {scormStatus['course-scorm'] === 'completed' ? (
                    <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <Badge tone="slate">1</Badge>
                  )}
                  <span className="text-truncate" style={{ color: '#1a1228' }}>
                    Course Content
                  </span>
                  <Badge tone="purple">SCORM</Badge>
                </div>
              )}
              {modules.map((m) => (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected({ type: 'module', id: m.id })}
                  className="d-flex align-items-center gap-2 px-3 py-2 small"
                  style={navItemStyle(selected.type === 'module' && selected.id === m.id)}
                >
                  {scormStatus[`module-${m.id}`] === 'completed' ? (
                    <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <Badge tone="slate">{m.order}</Badge>
                  )}
                  <span className="text-truncate fw-semibold" style={{ color: '#1a1228' }}>
                    {m.title}
                  </span>
                  <Badge tone="purple">{m.type === 'scorm' ? 'SCORM' : m.type}</Badge>
                </div>
              ))}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelected({ type: 'quiz' })}
                className="d-flex align-items-center gap-2 px-3 py-2 small fw-semibold"
                style={navItemStyle(selected.type === 'quiz')}
              >
                <HelpCircle size={14} style={{ color: '#9b87b5' }} />
                <span style={{ color: '#1a1228' }}>Quiz</span>
                <span className="ms-auto" style={{ color: '#9b87b5' }}>
                  {questions.length}
                </span>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelected({ type: 'certificate' })}
                className="d-flex align-items-center gap-2 px-3 py-2 small fw-semibold"
                style={navItemStyle(selected.type === 'certificate')}
              >
                <Award size={14} style={{ color: '#9b87b5' }} />
                <span style={{ color: '#1a1228' }}>Certificate</span>
              </div>
            </div>
          </div>

          <div className="h-100 d-flex flex-column" style={{ flex: '1 1 0%', minWidth: 0 }}>
            <div className="flex-grow-1 p-3" style={{ overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
              {selected.type === 'course-scorm' && hasCourseScorm && (
                <ScormPlayer
                  course={{ scormPackage: course.scormPackage, name: course.name, scormTitle: course.scormTitle, launchFile: course.launchFile }}
                  onProgressSaved={refreshScormProgress}
                />
              )}

              {selected.type === 'module' &&
                (() => {
                  const m = modules.find((mm) => mm.id === selected.id)
                  if (!m) return null
                  return (
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex align-items-center flex-wrap gap-2">
                        <span className="fw-bold" style={{ color: '#5c2d91' }}>
                          Module {m.order}
                        </span>
                        <span className="fw-semibold" style={{ color: '#1a1228' }}>
                          {m.title}
                        </span>
                        <Badge tone="purple">{m.type === 'scorm' ? 'SCORM' : m.type}</Badge>
                        {m.duration && (
                          <span className="small" style={{ color: '#9b87b5' }}>
                            {m.duration}
                          </span>
                        )}
                      </div>
                      <ModuleBody module={m} onProgressSaved={refreshScormProgress} />
                    </div>
                  )
                })()}

              {selected.type === 'quiz' &&
                (questions.length === 0 ? (
                  <p className="small mb-0" style={{ color: '#9b87b5' }}>
                    No quiz questions yet - add some in the Quiz Questions tab.
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {questions.map((q) => (
                      <div key={q.id} className="rounded-3 p-3" style={{ border: '1.5px solid #ede8f5', background: '#fdfcff' }}>
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                          <Badge tone="green">{q.type}</Badge>
                          <Badge tone="purple">{q.category}</Badge>
                          <span className="small ms-auto" style={{ color: '#9b87b5' }}>
                            {q.marks} mk{q.marks === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="fw-semibold mb-2" style={{ color: '#1a1228' }}>
                          {q.text}
                        </p>
                        <div className="d-flex flex-column gap-1">
                          {q.options.map((opt, i) => (
                            <div key={i} className="d-flex align-items-center gap-2 small" style={{ color: i === q.correctIndex ? '#16a34a' : '#7b6b94' }}>
                              {i === q.correctIndex ? (
                                <CheckCircle2 size={14} className="flex-shrink-0" />
                              ) : (
                                <XCircle size={14} className="flex-shrink-0 opacity-25" />
                              )}
                              {opt}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="mt-2 mb-0 small fst-italic" style={{ color: '#9b87b5' }}>
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

              {selected.type === 'certificate' && (
                <>
                  <div className="rounded-3 overflow-hidden border" style={{ maxWidth: 480 }}>
                    <CertificateSheet cert={sampleCert} />
                  </div>
                  <p className="small mt-2 mb-0" style={{ color: '#9b87b5' }}>
                    Sample only - shown with a placeholder name and score, not issued to anyone.
                  </p>
                </>
              )}
            </div>

            <div
              className="flex-shrink-0 d-flex align-items-center justify-content-between px-3 py-2"
              style={{ borderTop: '1px solid #ede8f5', background: '#fdfcff' }}
            >
              <Button disabled={!previousItem} icon={<ChevronLeft size={14} />} onClick={() => previousItem && setSelected(previousItem.selection)}>
                Previous
              </Button>
              <span className="small" style={{ color: '#9b87b5' }}>
                {currentIndex + 1} of {outlineItems.length}
              </span>
              <Button
                type="primary"
                disabled={!nextItem}
                iconPosition="end"
                icon={<ChevronRight size={14} />}
                onClick={() => nextItem && setSelected(nextItem.selection)}
              >
                Next{nextItem ? `: ${nextItem.label}` : ''}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
