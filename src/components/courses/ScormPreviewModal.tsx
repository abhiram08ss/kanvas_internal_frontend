import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { api, API_ORIGIN } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LoadingBlock } from '../ui/State'

interface Progress {
  lessonStatus: string
  scoreRaw: string
  lessonLocation: string
  sessionTime: string
}

const EMPTY: Progress = { lessonStatus: 'not attempted', scoreRaw: '', lessonLocation: '', sessionTime: '' }

const statusTone = (s: string) =>
  s === 'passed' || s === 'completed' ? 'green' : s === 'failed' ? 'red' : s === 'incomplete' || s === 'browsed' ? 'amber' : 'slate'

/** What the preview needs - a `Course` already has all of these; a SCORM module maps to this shape too
 * (its own `scormPackage`/`scormTitle`/`launchFile`, `title` as `name`) so the same player works for both.
 * `scormPackage` is only ever null before a package is attached - a caller only opens this once it isn't. */
export interface ScormPreviewTarget {
  scormPackage: string | null
  name: string
  scormTitle?: string | null
  launchFile?: string | null
}

/**
 * Runs a SCORM package (a course's own, or one attached to a single module) inside the backend-hosted
 * SCORM 1.2 player. The player lives on the backend origin (so untrusted course JavaScript cannot touch
 * this app's session) and reports status/score back through postMessage. It is opened with a launch token
 * scoped to this user and package, so the backend restores and saves the user's progress - the course
 * resumes where they left off.
 *
 * The player body on its own, with no surrounding Modal chrome - so a caller that already has its own
 * layout (e.g. the course preview's inline content pane) can embed it directly instead of popping it open.
 */
export function ScormPlayer({ course, onProgressSaved }: { course: ScormPreviewTarget; onProgressSaved?: () => void }) {
  const { user } = useAuth()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [progress, setProgress] = useState<Progress>(EMPTY)
  // undefined = still fetching; null = couldn't get one (the course still plays, but progress isn't saved)
  const [launchToken, setLaunchToken] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    api
      .scormLaunch(course.scormPackage!)
      .then((r) => !cancelled && setLaunchToken(r.launchToken))
      .catch(() => !cancelled && setLaunchToken(null))
    return () => {
      cancelled = true
    }
  }, [course.scormPackage])

  const query = launchToken ? `?t=${encodeURIComponent(launchToken)}` : user?.name ? `?name=${encodeURIComponent(user.name)}` : ''
  const playerUrl = `${API_ORIGIN}/scorm/player/${course.scormPackage}${query}`

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    const onMessage = (event: MessageEvent) => {
      // Only trust messages from our own player iframe, on the backend origin, for this package.
      if (event.origin !== API_ORIGIN || event.source !== frameRef.current?.contentWindow) return
      const msg = event.data as { source?: string; packageId?: string; data?: Progress }
      if (msg?.source !== 'kanvas-scorm' || msg.packageId !== course.scormPackage || !msg.data) return
      setProgress({
        lessonStatus: msg.data.lessonStatus,
        scoreRaw: msg.data.scoreRaw,
        lessonLocation: msg.data.lessonLocation,
        sessionTime: msg.data.sessionTime,
      })
      // The player saves ~1s after the last change (immediately on commit/finish): wait for that, then
      // let the caller know it's worth re-reading this package's saved progress from the server.
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => onProgressSaved?.(), 1800)
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      clearTimeout(refreshTimer)
    }
  }, [course.scormPackage, onProgressSaved])

  const sessionStatus = progress.lessonStatus

  return (
    <>
      {launchToken === undefined ? (
        <div className="d-flex align-items-center justify-content-center" style={{ height: '52vh' }}>
          <LoadingBlock label="Loading course…" />
        </div>
      ) : (
        <iframe
          ref={frameRef}
          src={playerUrl}
          title={`SCORM preview: ${course.name}`}
          className="w-100 rounded-2 border bg-white"
          style={{ height: '52vh' }}
          allow="fullscreen"
        />
      )}
      <div className="mt-3 d-flex flex-wrap align-items-center justify-content-between gap-3 small">
        <div className="d-flex flex-wrap align-items-center gap-4 row-gap-2">
          <span className="d-flex align-items-center gap-2 text-secondary">
            This session <Badge tone={statusTone(sessionStatus)}>{sessionStatus}</Badge>
          </span>
          <span className="text-secondary">
            Score <strong className="text-dark">{progress.scoreRaw !== '' ? progress.scoreRaw : '—'}</strong>
          </span>
          {progress.lessonLocation && (
            <span className="text-secondary">
              Location <strong className="text-dark">{progress.lessonLocation}</strong>
            </span>
          )}
          {progress.sessionTime && (
            <span className="text-secondary">
              Session <strong className="text-dark">{progress.sessionTime}</strong>
            </span>
          )}
        </div>
        <a
          href={playerUrl}
          target="_blank"
          rel="noreferrer"
          className="d-flex align-items-center gap-2 fw-semibold text-primary text-decoration-none"
          style={{ fontSize: 12 }}
        >
          Open in new tab <ExternalLink size={12} />
        </a>
      </div>
      <p className="mt-2 text-secondary mb-0" style={{ fontSize: 12 }}>
        {launchToken
          ? 'Your progress is saved automatically — reopening this course resumes where you left off.'
          : 'Progress could not be saved for this session.'}
      </p>
    </>
  )
}

/** `ScormPlayer` popped open in its own dialog - what a caller without its own surrounding layout uses. */
export function ScormPreviewModal({ course, onClose }: { course: ScormPreviewTarget; onClose: () => void }) {
  return (
    <Modal title={course.name} subtitle={`SCORM preview · ${course.scormTitle ?? course.launchFile ?? ''}`} onClose={onClose} size="xl">
      <ScormPlayer course={course} />
    </Modal>
  )
}
