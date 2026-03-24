const VERSION = '__SW_VERSION__'
const CACHE   = `npsnav-${VERSION}`
const SHELL   = ['/']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.startsWith('/_vercel')) return
  if (url.pathname.startsWith('/proxy/')) {
    e.respondWith(fetch(request))
    return
  }

  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
        }
        return res
      })
      .catch(() =>
        caches.match(request).then(cached => cached || caches.match('/'))
      )
  )
})

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return

  const data = e.data.json()

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-32.png',
      tag:     'nav-update',          // replaces previous notification
      renotify: true,
      data:    { url: data.url || '/' },
      actions: [
        { action: 'open',    title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss'  },
      ],
    })
  )
})

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close()

  if (e.action === 'dismiss') return

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        // If app is already open — focus it
        const existing = list.find(c => c.url.includes(location.origin))
        if (existing) return existing.focus()
        // Otherwise open a new window
        return clients.openWindow('/')
      })
  )
})

// ── Skip waiting on message ───────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
})