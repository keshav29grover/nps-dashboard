import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// ── Service Worker registration with auto-update ──────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      console.log('[SW] Registered')

      // Check for updates every 60 seconds
      setInterval(() => reg.update(), 60 * 1000)

      // When a new SW is waiting — auto-apply it
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return

        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available — reloading')
            // Tell new SW to skip waiting and take over
            newSW.postMessage('SKIP_WAITING')
          }
        })
      })

      // When SW takes control — reload the page to get fresh assets
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          console.log('[SW] Controller changed — reloading for fresh assets')
          window.location.reload()
        }
      })

    } catch (err) {
      console.error('[SW] Registration failed:', err)
    }
  })
}