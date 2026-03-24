// hooks/usePushNotifications.js
// Handles asking permission, subscribing, and saving the subscription

import { useState, useEffect } from 'react'

// This must match the VAPID public key in your GitHub Secrets
// Replace this with your actual generated public key
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - base64String.length % 4) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [permission,    setPermission]    = useState(Notification.permission)
  const [subscription,  setSubscription]  = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  // Check existing subscription on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) {
          setSubscription(sub)
          setPermission('granted')
          // Save to localStorage so we know we're subscribed
          localStorage.setItem('nps-push-sub', JSON.stringify(sub))
        }
      })
    })
  }, [])

  const subscribe = async () => {
    setLoading(true)
    setError(null)

    try {
      // Ask for permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        setError('Permission denied')
        setLoading(false)
        return
      }

      // Get SW registration
      const reg = await navigator.serviceWorker.ready

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      setSubscription(sub)

      // Save subscription to localStorage
      // In production you'd send this to your own backend
      // For now we save locally and GitHub Actions reads from a fixed subscription
      localStorage.setItem('nps-push-sub', JSON.stringify(sub))

      console.log('[Push] Subscribed:', JSON.stringify(sub))
      console.log('[Push] Copy the above and add as PUSH_SUBSCRIPTION secret in GitHub')

      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    if (!subscription) return
    await subscription.unsubscribe()
    setSubscription(null)
    setPermission('default')
    localStorage.removeItem('nps-push-sub')
  }

  const isSupported  = 'serviceWorker' in navigator && 'PushManager' in window
  const isSubscribed = !!subscription && permission === 'granted'

  return { permission, subscription, loading, error, subscribe, unsubscribe, isSupported, isSubscribed }
}