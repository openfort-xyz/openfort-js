import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { EventMonitorProvider } from './contexts/EventMonitorContext'
import { OpenfortProvider } from './contexts/OpenfortContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EventMonitorProvider>
      <OpenfortProvider>
        <App />
      </OpenfortProvider>
    </EventMonitorProvider>
  </StrictMode>
)
