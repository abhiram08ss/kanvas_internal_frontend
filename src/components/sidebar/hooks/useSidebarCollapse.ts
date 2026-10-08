import { useState } from 'react'

/** Whether the sidebar shows full labels or just icons. */
export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(false)
  return { collapsed, toggle: () => setCollapsed((c) => !c) }
}
