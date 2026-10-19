import NavigationBoundary from './NavigationBoundary'

import BootSplash from './BootSplash'
import {startBoot,notifyStartupReady} from './startupLifecycle'
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


const boot=startBoot()
const bootElement=document.getElementById('boot-root')
if(bootElement)ReactDOM.createRoot(bootElement).render(<BootSplash lifecycle={boot}/>)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary><NavigationBoundary/><React.Suspense fallback={<div className="auth-stage"><p>{tr("Opening screen…")}</p></div>}>{configurationError && !demoEnabled ? <main className="auth-stage"><section className="auth-card"><h1>{tr("Connection setup required")}</h1><p role="alert">{configurationError}</p></section></main> : <App />}</React.Suspense></ErrorBoundary>
  </React.StrictMode>,
)

if(configurationError&&!demoEnabled)notifyStartupReady()
registerPosServiceWorker()

import './buttons.css'
import './phone.css'
import './receipts.css'

import './operations.css'

import './ingredientPurchasing.css'

import './searchField.css'

import './sharedTheme.css'


import './calendar.css'

import './systemStyle.css'

import './release12.css'

import './branding.css'
import './accessibility.css'
