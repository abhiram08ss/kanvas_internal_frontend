import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'kanvas-sidebar-collapsed'

/** Below this width (px) the sidebar becomes a slide-in drawer opened from the header, instead of a fixed column. */
export const MOBILE_BREAKPOINT = 992

interface SidebarCollapseValue {
  collapsed: boolean
  toggle: () => void
  /** True on phones / small tablets: the sidebar is an off-canvas drawer. */
  mobile: boolean
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}

const SidebarCollapseContext = createContext<SidebarCollapseValue | undefined>(undefined)

/** Holds whether the sidebar shows full labels or just icons. Lives above every page so the sidebar and the
 *  page header's toggle button share one value, and the choice is remembered across pages and reloads. */
export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? '0' : '1')
      } catch {
        // storage unavailable - the toggle still works for this session
      }
      return !c
    })
  const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches)
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => {
      setMobile(mq.matches)
      if (!mq.matches) setDrawerOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return <SidebarCollapseContext.Provider value={{ collapsed, toggle, mobile, drawerOpen, setDrawerOpen }}>{children}</SidebarCollapseContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSidebarCollapse(): SidebarCollapseValue {
  const ctx = useContext(SidebarCollapseContext)
  if (!ctx) throw new Error('useSidebarCollapse must be used inside <SidebarCollapseProvider>')
  return ctx
}
