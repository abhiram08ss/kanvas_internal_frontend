import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import { LucideProvider } from 'lucide-react'
import { antdTheme } from './theme/antdTheme'
import { KLoader, KRing } from './components/ui/KLoader'
import './styles/theme.scss'
import './theme/antd-overrides.css'
import App from './App.tsx'
import { SidebarCollapseProvider } from './components/sidebar/hooks/useSidebarCollapse'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={antdTheme} button={{ loadingIcon: <KRing size={16} /> }} spin={{ indicator: <KLoader size="md" /> }}>
      <AntApp notification={{ placement: 'topRight', duration: 4, showProgress: true, pauseOnHover: true, top: 72 }}>
        <LucideProvider strokeWidth={1.75}>
          <BrowserRouter>
            <SidebarCollapseProvider>
              <App />
            </SidebarCollapseProvider>
          </BrowserRouter>
        </LucideProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
