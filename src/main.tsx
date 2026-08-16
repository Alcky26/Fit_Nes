import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import './styles/theme.css'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root was not found in index.html')
}

registerServiceWorker()

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
