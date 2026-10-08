import { Switch } from 'antd'

export function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <Switch checked={checked} disabled={disabled} onChange={onChange} />
}
