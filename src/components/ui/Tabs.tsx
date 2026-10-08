import { Tabs as AntTabs } from 'antd'

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return <AntTabs activeKey={active} onChange={onChange} items={tabs.map((t) => ({ key: t, label: t }))} className="mb-2" />
}
