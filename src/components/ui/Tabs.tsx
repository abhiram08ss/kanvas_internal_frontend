import type { ReactNode } from 'react'
import { Tabs as AntTabs } from 'antd'

/**
 * Page tabs. `variant="pill"` is a compact segmented switch (icon + label in a rounded track, the active one
 * lifted on a white chip) for pages that only have a couple of views; the default is the underlined tab bar.
 */
export function Tabs({
  tabs,
  active,
  onChange,
  variant = 'line',
  icons,
}: {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
  variant?: 'line' | 'pill'
  icons?: Record<string, ReactNode>
}) {
  if (variant === 'pill') {
    return (
      <div className="pill-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={t === active} className={`pill-tab${t === active ? ' is-active' : ''}`} onClick={() => onChange(t)}>
            {icons?.[t]}
            {t}
          </button>
        ))}
      </div>
    )
  }
  return <AntTabs activeKey={active} onChange={onChange} items={tabs.map((t) => ({ key: t, label: t }))} className="mb-2" />
}
