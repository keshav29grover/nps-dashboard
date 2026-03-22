// sw.js — Smart service worker with auto-update on new deploy

const VERSION   = '__SW_VERSION__'   // injected by build — changes every deploy
const CACHE     = `npsnav-${VERSION}`
const SHELL     = ['/']              // only cache the shell, not assets

// ── Install: cache shell only ─────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())   // activate immediately, don't wait
  )
})

// ── Activate: delete ALL old caches ──────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE)     // delete everything except current
          .map(k => {
            console.log('[SW] Deleting old cache:', k)
            return caches.delete(k)
          })
      ))
      .then(() => self.clients.claim()) // take control of all open tabs
  )
})

// ── Fetch: network first for everything ──────────────────────────────────────
// Network-first means users ALWAYS get fresh code after a deploy.
// Only falls back to cache if completely offline.
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== location.origin) return

  // Skip Vercel internals
  if (url.pathname.startsWith('/_vercel')) return

  // API calls — network only, no caching (always want fresh NAV data)
  if (url.pathname.startsWith('/proxy/')) {
    e.respondWith(fetch(request))
    return
  }

  // Everything else — network first, cache fallback
  e.respondWith(
    fetch(request)
      .then(res => {
        // Only cache valid responses
        if (res.ok && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
        }
        return res
      })
      .catch(() => {
        // Offline fallback — serve from cache
        return caches.match(request)
          .then(cached => cached || caches.match('/'))
      })
  )
})

// ── Message: force update from app ───────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
})