import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Tip {
  text: string
  left: number
  top: number
  below: boolean
}

/**
 * Gives every element that has a plain `title="..."` the app's tooltip look, instead of the browser's grey box.
 * Mounted once at the app root: on hover it lifts the element's `title` into a styled bubble (and puts the
 * attribute back afterwards, so accessibility is unchanged). antd's own `<Tooltip>` already has the same look.
 */
export function GlobalTooltip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const active = useRef<{ el: HTMLElement; title: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const restore = () => {
      window.clearTimeout(timer.current)
      const cur = active.current
      if (cur) {
        if (!cur.el.hasAttribute('title')) cur.el.setAttribute('title', cur.title)
        active.current = null
      }
      setTip(null)
    }

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest?.('[title]') as HTMLElement | null
      if (!el || el.tagName === 'IFRAME' || el.tagName === 'SVG') return
      if (el.closest('.ant-tabs-nav, .ant-segmented, .ant-select, .ant-select-dropdown')) {
        // tabs, filter pills and dropdown lists never get a tooltip: drop antd's own title so the browser's grey box stays away too
        el.removeAttribute('title')
        return
      }
      const title = el.getAttribute('title')?.trim()
      if (!title) return
      if (active.current?.el === el) return
      restore()
      el.removeAttribute('title') // stop the browser's own tooltip
      active.current = { el, title }
      timer.current = window.setTimeout(() => {
        const r = el.getBoundingClientRect()
        const below = r.top < 56
        setTip({ text: title, left: r.left + r.width / 2, top: below ? r.bottom + 10 : r.top - 10, below })
      }, 250)
    }

    const onOut = (e: MouseEvent) => {
      const cur = active.current
      if (!cur) return
      const to = e.relatedTarget as Node | null
      if (to && cur.el.contains(to)) return
      restore()
    }

    document.addEventListener('mouseover', onOver, true)
    document.addEventListener('mouseout', onOut, true)
    window.addEventListener('scroll', restore, true)
    window.addEventListener('mousedown', restore, true)
    window.addEventListener('blur', restore)
    return () => {
      document.removeEventListener('mouseover', onOver, true)
      document.removeEventListener('mouseout', onOut, true)
      window.removeEventListener('scroll', restore, true)
      window.removeEventListener('mousedown', restore, true)
      window.removeEventListener('blur', restore)
      restore()
    }
  }, [])

  // Keep the bubble inside the window (e.g. next to the sidebar's left edge) and point its arrow at the element.
  const bubble = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = bubble.current
    if (!tip || !el) return
    const half = el.offsetWidth / 2
    const left = Math.min(Math.max(tip.left, half + 8), window.innerWidth - half - 8)
    el.style.left = `${left}px`
    el.style.setProperty('--arrow-x', `${half + (tip.left - left)}px`)
  }, [tip])

  if (!tip) return null
  return createPortal(
    <div ref={bubble} className={`kv-gtip${tip.below ? ' is-below' : ''}`} role="tooltip" style={{ left: tip.left, top: tip.top }}>
      {tip.text}
    </div>,
    document.body,
  )
}
