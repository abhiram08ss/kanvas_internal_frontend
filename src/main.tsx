import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import { antdTheme } from './theme/antdTheme'
import './styles/theme.scss'
import './theme/antd-overrides.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
