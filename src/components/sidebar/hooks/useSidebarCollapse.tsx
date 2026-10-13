import { createContext, useContext, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'kanvas-sidebar-collapsed'

interface SidebarCollapseValue {
  collapsed: boolean
  toggle: () => void
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
  return <SidebarCollapseContext.Provider value={{ collapsed, toggle }}>{children}</SidebarCollapseContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSidebarCollapse(): SidebarCollapseValue {
  const ctx = useContext(SidebarCollapseContext)
  if (!ctx) throw new Error('useSidebarCollapse must be used inside <SidebarCollapseProvider>')
  return ctx
}
