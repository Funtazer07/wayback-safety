import { isInstalled, isIphone } from '../../lib/install.ts'
import { supabase } from '../../lib/supabase.ts'

/**
 * Where this phone stands with notifications:
 * - unsupported:   this browser cannot receive push messages at all.
 * - needs-install: an iPhone only allows push once the app is on the Home Screen.
 * - not-set-up:    the app has no VITE_VAPID_PUBLIC_KEY (see .env.example).
 * - dev-server:    `npm run dev` has no service worker, so push cannot work there.
 * - off:          not on yet; the app can ask.
 * - blocked:       the user said no. Only the phone's settings can change that now.
 * - on:            this phone can get alerts.
 */
export type NotificationState =
  'unsupported' | 'needs-install' | 'not-set-up' | 'dev-server' | 'off' | 'blocked' | 'on'

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

/**
 * Turns the public VAPID key (base64url text) into the bytes the browser asks for. The key tells
 * the push service that messages for this phone may only come from our server.
 */
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

/**
 * Checks this phone without asking the user anything. When notifications are already on, the
 * subscription is saved again, so the server always knows it belongs to the account now signed in.
 */
export async function checkNotifications(): Promise<NotificationState> {
  if (isIphone() && !isInstalled()) return 'needs-install'
  if (!isPushSupported()) return 'unsupported'
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) return 'not-set-up'
  // vite-plugin-pwa only adds the service worker to a build. Without this, the button would wait
  // for a service worker that never comes.
  if (import.meta.env.DEV) return 'dev-server'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'

  const subscription = await currentSubscription()
  if (!subscription) return 'off'
  await saveSubscription(subscription)
  return 'on'
}

/**
 * Asks for permission and, when the user allows it, saves this phone on the server. Call it only
 * from a button tap: iPhones ignore the question otherwise.
 */
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
        // Browsers require that every push shows a notification: no silent background messages.
        userVisibleOnly: true,
        applicationServerKey: vapidKeyToBytes(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''),
      }))
  } catch (error) {
    throw new BrowserPushError(error)
  }
  await saveSubscription(subscription)
  return 'on'
}

/**
 * The browser could not reach its push service, so the problem is not our server. Seen in Brave
 * (Google push is off there by default) and on networks that block Google's push service.
 */
export class BrowserPushError extends Error {
  constructor(cause: unknown) {
    super('The browser could not turn on push messages', { cause })
    this.name = 'BrowserPushError'
  }
}

/**
 * Stops alerts on this phone (SCRUM-105): deletes it on the server, then in the browser. Used by
 * the Account tab and before logging out, so it must also work where push never worked.
 *
 * Either step alone is enough to stop the alerts: without the server row nothing is sent, and
 * without the browser subscription the push service refuses the message (the Edge Function then
 * deletes the row, see isSubscriptionGone). So it only fails when both steps fail.
 */
export async function disableNotifications(): Promise<void> {
  if (!isPushSupported()) return
  // getRegistration, not ready: on the dev server there is no service worker, and ready would
  // wait forever. That would also block logging out.
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
