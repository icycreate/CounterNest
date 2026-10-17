import {tr} from './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import './styles.css'
import './navigation.css'
import './ux.css'
import { registerPosServiceWorker } from './pwa'
import { configurationError, demoEnabled } from './lib/supabase'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary><React.Suspense fallback={<div className="auth-stage"><p>{tr("Opening screen…")}</p></div>}>{configurationError && !demoEnabled ? <main className="auth-stage"><section className="auth-card"><h1>{tr("Connection setup required")}</h1><p role="alert">{configurationError}</p></section></main> : <App />}</React.Suspense></ErrorBoundary>
  </React.StrictMode>,
)

registerPosServiceWorker()

import './buttons.css'
import './phone.css'
import './receipts.css'

import './operations.css'

import './ingredientPurchasing.css'
