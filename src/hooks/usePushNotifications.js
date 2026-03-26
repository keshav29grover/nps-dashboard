// hooks/usePushNotifications.js
// Handles asking permission, subscribing, and saving the subscription

import { useState, useEffect } from 'react'
import { removePushSubscription, savePushSubscription } from '../api/pushApi'

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

  const syncSubscription = async (sub) => {
    if (!sub) return
    await savePushSubscription(sub.toJSON())
    setSubscription(sub)
    setPermission(Notification.permission)
    localStorage.setItem('nps-push-sub', JSON.stringify(sub))
  }

  // Check existing subscription on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(async (sub) => {
        if (sub) {
          try {
            await syncSubscription(sub)
          } catch (err) {
            setError(err.message)
          }
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

      const existingSub = await reg.pushManager.getSubscription()
      if (existingSub) {
        await syncSubscription(existingSub)
        setLoading(false)
        return
      }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await syncSubscription(sub)

      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    if (!subscription) return
    setLoading(true)
    setError(null)

    try {
      await removePushSubscription(subscription.toJSON())
      await subscription.unsubscribe()
      setSubscription(null)
      setPermission('default')
      localStorage.removeItem('nps-push-sub')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isSupported  = 'serviceWorker' in navigator && 'PushManager' in window
  const isSubscribed = !!subscription && permission === 'granted'

  return { permission, subscription, loading, error, subscribe, unsubscribe, isSupported, isSubscribed }
}
