import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// ── Service Worker with zero-friction auto-update ─────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      // Helper — tells a SW to activate immediately without waiting
      const skipWaiting = (sw) => sw.postMessage('SKIP_WAITING')

      // If a new SW is already waiting when the page loads
      // (tab was open during a deploy) — activate it right away
      if (reg.waiting) {
        skipWaiting(reg.waiting)
      }

      // When a new SW finishes installing — activate immediately
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            skipWaiting(newSW)
          }
        })
      })

      // When the new SW takes control — reload once, silently
      // At this point the new assets are already in cache so the
      // reload is instant — user sees no blank screen or flash
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })

      // Poll for updates every 30 seconds so the reload happens
      // sooner rather than the default browser interval (~24 hours)
      setInterval(() => reg.update(), 30 * 1000)

    } catch (err) {
      console.error('[SW] Registration failed:', err)
    }
  })
}