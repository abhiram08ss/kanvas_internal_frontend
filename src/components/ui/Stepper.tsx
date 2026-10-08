import { Steps } from 'antd'

/** Wizard progress (Ant Design Steps); `current` is 1-based. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return <Steps current={current - 1} titlePlacement="vertical" items={steps.map((title) => ({ title }))} />
}
