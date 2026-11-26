import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import SessionProvider from './features/auth/SessionProvider.tsx'
import { listenForInstallPrompt } from './lib/install.ts'
import './day.css'

listenForInstallPrompt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
)
