import * as api from './api'

export function pushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function vapidConfigured(): boolean {
  return Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

// Subscribe this browser (after notification permission is granted) and store
// the subscription so the daily-push Edge Function can reach it. Safe to call
// repeatedly: an existing subscription is kept and its record refreshed,
// since push services rotate endpoints over time.
export async function subscribeThisDevice(): Promise<void> {
  if (!pushSupported()) {
    throw new Error('Push notifications are not supported in this browser.')
  }
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    throw new Error('Missing VITE_VAPID_PUBLIC_KEY — pushes cannot be configured.')
  }
  if (Notification.permission !== 'granted') {
    throw new Error('Notification permission has not been granted for this site.')
  }
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }))
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('This browser returned an incomplete push subscription.')
  }
  await api.upsertPushSubscription({
    endpoint: json.endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent.slice(0, 200),
  })
}

export async function unsubscribeThisDevice(): Promise<void> {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await api.deletePushSubscription(subscription.endpoint)
  await subscription.unsubscribe()
}

// Background refresh on app load: re-register the stored endpoint when daily
// pushes are enabled and permission was already granted (endpoints rotate).
export async function ensureDeviceSubscription(): Promise<void> {
  if (!pushSupported() || !vapidConfigured()) return
  if (Notification.permission !== 'granted') return
  try {
    const settings = await api.fetchPushSettings()
    if (!settings.enabled) return
    await subscribeThisDevice()
  } catch {
    // best-effort; Settings surfaces actionable errors
  }
}
