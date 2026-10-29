import { isInstalled, isIphone } from '../../lib/install.ts'
import { supabase } from '../../lib/supabase.ts'

/** needs-install: an iPhone only allows push once the app is on the Home Screen. */
export type NotificationState =
  'unsupported' | 'needs-install' | 'not-set-up' | 'dev-server' | 'off' | 'blocked' | 'on'

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

export function vapidKeyToBytes(key: string): Uint8Array<ArrayBuffer> {
  const base64 = key.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

async function saveSubscription(subscription: PushSubscription) {
  const { endpoint, keys } = subscription.toJSON()
  const { error } = await client().rpc('save_push_subscription', {
    push_endpoint: endpoint,
    push_p256dh: keys?.p256dh,
    push_auth: keys?.auth,
  })
  if (error) throw error
}

/** Saves the subscription again, so it belongs to the account that is signed in now. */
export async function checkNotifications(): Promise<NotificationState> {
  if (isIphone() && !isInstalled()) return 'needs-install'
  if (!isPushSupported()) return 'unsupported'
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) return 'not-set-up'
  // The dev server has no service worker.
  if (import.meta.env.DEV) return 'dev-server'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'

  const subscription = await currentSubscription()
  if (!subscription) return 'off'
  await saveSubscription(subscription)
  return 'on'
}

/** Call only from a button tap: iPhones ignore the question otherwise. */
export async function enableNotifications(): Promise<NotificationState> {
  const permission = await Notification.requestPermission()
  if (permission === 'denied') return 'blocked'
  if (permission !== 'granted') return 'off'

  const registration = await navigator.serviceWorker.ready
  let subscription: PushSubscription
  try {
    subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyToBytes(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''),
      }))
  } catch (error) {
    throw new BrowserPushError(error)
  }
  await saveSubscription(subscription)
  return 'on'
}

/** The browser could not reach its push service, for example Brave with Google push off. */
export class BrowserPushError extends Error {
  constructor(cause: unknown) {
    super('The browser could not turn on push messages', { cause })
    this.name = 'BrowserPushError'
  }
}

/** Either step alone stops the alerts, so this fails only when both fail. */
export async function disableNotifications(): Promise<void> {
  if (!isPushSupported()) return
  // Not `ready`: without a service worker it waits forever and blocks logging out.
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  const { error } = await client()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint)
  const isUnsubscribed = await subscription.unsubscribe().catch(() => false)
  if (error && !isUnsubscribed) throw error
}
