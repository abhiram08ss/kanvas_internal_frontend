import type { ReactNode } from 'react'
import { Modal as AntModal } from 'antd'

const BRAND_GRADIENT = 'linear-gradient(135deg, #5c2d91, #7b3fa0)'
// 'full' stays just short of 100vw: a truly edge-to-edge centered modal would sit its edge under the
// app's own left sidebar (256px) on typical screens. 96vw leaves a sliver of margin (clearing the sidebar
// on anything but a quite narrow window) while still reading as "full screen".
const WIDTH = { default: 560, lg: 860, xl: 1140, full: '96vw' }

/**
 * The app's one popup: an Ant Design Modal with the LMS Content look. `tone="brand"` gives it the purple
 * gradient header (with an icon badge) used by authoring popups; every other popup keeps a plain header.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  size,
  icon,
  tone = 'default',
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  size?: 'lg' | 'xl' | 'full'
  /** Small icon shown in a badge before the title. Only rendered when `tone="brand"`. */
  icon?: ReactNode
  /** 'default' (plain white header) or 'brand' (Kanvas-purple header, for a popup that should stand out). */
  tone?: 'default' | 'brand'
}) {
  const branded = tone === 'brand'

  return (
    <AntModal
      open
      centered
      footer={null}
      onCancel={onClose}
      width={WIDTH[size ?? 'default']}
      title={
        <div className="d-flex align-items-center gap-3">
          {branded && icon && (
            <div
              className="d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.16)', color: '#fff' }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-display fw-bold" style={{ fontSize: 17, lineHeight: 1.3, color: branded ? '#fff' : '#1a1228' }}>
              {title}
            </div>
            {subtitle && (
              <div className="mt-1 fw-normal" style={{ fontSize: 13, color: branded ? 'rgba(255,255,255,0.82)' : '#7b6b94' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
      }
      styles={{
        container: { padding: 0, overflow: 'hidden', borderRadius: 14 },
        header: {
          margin: 0,
          padding: '16px 24px',
          background: branded ? BRAND_GRADIENT : '#ffffff',
          borderBottom: branded ? 'none' : '1px solid #ede8f5',
        },
        close: { color: branded ? '#ffffff' : undefined },
        body: { padding: 24, maxHeight: size === 'full' ? 'calc(100vh - 100px)' : 'calc(100vh - 190px)', overflowY: 'auto' },
      }}
    >
      {children}
    </AntModal>
  )
}
