import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api, type Course } from '../../../api'
import { useAuth } from '../../../context/AuthContext'

const REFRESH_MS = 60_000

const seenKey = (userId: number) => `kanvas-seen-rejections:${userId}`
/** A rejection is identified by the course and when it was rejected, so rejecting the same course again counts as new. */
const rejectionId = (c: Course) => `${c.id}:${c.approvedAt ?? ''}`

const readSeen = (userId: number): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
const writeSeen = (userId: number, ids: string[]) => {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(ids))
  } catch {
    /* storage unavailable: the badge just comes back next time */
  }
}

/**
 * The count shown on the sidebar's Approvals item - for a Content User only (a Super Admin never sees one):
 * NEW rejections of their courses. A rejection stops counting as soon as they have opened Approvals.
 * Refreshes on every page change, when the window regains focus, and once a minute.
 */
export function useApprovalBadge(): { count: number; tone: 'red' } {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [count, setCount] = useState(0)
  const isSuper = user?.role === 'Super Admin'
  const userId = user?.id
  const onApprovals = pathname.startsWith('/approvals')

  const refresh = useCallback(async () => {
    if (userId === undefined || isSuper) return setCount(0)
    try {
      const courses = await api.pendingCourses()
      const rejected = courses.filter((c) => c.approvalStatus === 'rejected')
      if (onApprovals) {
        // Looking at the Approvals page = the rejections have been seen.
        writeSeen(userId, rejected.map(rejectionId))
        setCount(0)
      } else {
        const seen = readSeen(userId)
        setCount(rejected.filter((c) => !seen.has(rejectionId(c))).length)
      }
    } catch {
      /* a failed refresh keeps the previous number */
    }
  }, [userId, isSuper, onApprovals])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, pathname])

  return { count, tone: 'red' }
}
