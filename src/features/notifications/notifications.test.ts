import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  BrowserPushError,
  checkNotifications,
  disableNotifications,
  enableNotifications,
  vapidKeyToBytes,
} from './notifications.ts'

const { rpc, eq } = vi.hoisted(() => ({ rpc: vi.fn(), eq: vi.fn() }))

vi.mock('../../lib/supabase.ts', () => ({
  supabase: { rpc, from: () => ({ delete: () => ({ eq }) }) },
}))

const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9)'

// A made-up subscription, shaped like the one a browser hands out.
function fakeSubscription() {
  const endpoint = 'https://fcm.googleapis.com/fcm/send/phone-1'
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'key-p256dh', auth: 'key-auth' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }
}

// Fakes the browser parts the code uses: the service worker with its push manager, and the
// Notification permission.
function fakeBrowser({
  permission = 'default',
  answer = 'granted',
  existing = null as ReturnType<typeof fakeSubscription> | null,
  userAgent = ANDROID,
  hasPush = true,
} = {}) {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(existing),
    subscribe: vi.fn().mockResolvedValue(fakeSubscription()),
  }
  vi.stubGlobal('navigator', {
    userAgent,
    serviceWorker: { ready: Promise.resolve({ pushManager }) },
  })
  // jsdom has no PushManager, so leaving it out looks like a browser without push.
  if (hasPush) vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', {
    permission,
    requestPermission: vi.fn().mockResolvedValue(answer),
  })
  return pushManager
}

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ error: null })
  eq.mockReset().mockResolvedValue({ error: null })
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '-_-_')
  // Tests run like the dev server; most of them check the built app.
  vi.stubEnv('DEV', false)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

test('the public key is turned from base64url text into bytes', () => {
  expect([...vapidKeyToBytes('-_-_')]).toEqual([251, 255, 191])
  expect([...vapidKeyToBytes('AQ')]).toEqual([1])
})

test('an iPhone has to add the app to the Home Screen first', async () => {
  fakeBrowser({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })

  expect(await checkNotifications()).toBe('needs-install')
})

test('a browser without push cannot get notifications', async () => {
  fakeBrowser({ hasPush: false })

  expect(await checkNotifications()).toBe('unsupported')
})

test('without the public key the app says notifications are not set up', async () => {
  fakeBrowser()
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')

  expect(await checkNotifications()).toBe('not-set-up')
})

test('on the dev server the app says push only works in a build', async () => {
  fakeBrowser()
  vi.stubEnv('DEV', true)

  expect(await checkNotifications()).toBe('dev-server')
})

test('a user who said no is told notifications are blocked', async () => {
  fakeBrowser({ permission: 'denied' })

  expect(await checkNotifications()).toBe('blocked')
})

test('a phone that already has notifications on is saved again for the signed-in account', async () => {
  fakeBrowser({ permission: 'granted', existing: fakeSubscription() })

  expect(await checkNotifications()).toBe('on')
  expect(rpc).toHaveBeenCalledWith('save_push_subscription', {
    push_endpoint: 'https://fcm.googleapis.com/fcm/send/phone-1',
    push_p256dh: 'key-p256dh',
    push_auth: 'key-auth',
  })
})

test('allowing notifications subscribes this phone with our key and saves it', async () => {
  const pushManager = fakeBrowser()

  expect(await enableNotifications()).toBe('on')
  expect(pushManager.subscribe).toHaveBeenCalledWith({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyToBytes('-_-_'),
  })
  expect(rpc).toHaveBeenCalledWith('save_push_subscription', expect.anything())
})

test('saying no to notifications saves nothing', async () => {
  const pushManager = fakeBrowser({ answer: 'denied' })

  expect(await enableNotifications()).toBe('blocked')
  expect(pushManager.subscribe).not.toHaveBeenCalled()
  expect(rpc).not.toHaveBeenCalled()
})

test('turning on notifications fails when the server cannot save the phone', async () => {
  fakeBrowser()
  const error = new Error('Network error')
  rpc.mockResolvedValue({ error })

  await expect(enableNotifications()).rejects.toBe(error)
})

test('turning off deletes this phone on the server and then in the browser', async () => {
  const subscription = fakeSubscription()
  fakeBrowser({ permission: 'granted', existing: subscription })

  await disableNotifications()

  expect(eq).toHaveBeenCalledWith('endpoint', 'https://fcm.googleapis.com/fcm/send/phone-1')
  expect(subscription.unsubscribe).toHaveBeenCalled()
})

test('turning off keeps the browser subscription when the server cannot delete it', async () => {
  const subscription = fakeSubscription()
  fakeBrowser({ permission: 'granted', existing: subscription })
  eq.mockResolvedValue({ error: new Error('Network error') })

  await expect(disableNotifications()).rejects.toThrow('Network error')
  expect(subscription.unsubscribe).not.toHaveBeenCalled()
})

test('a push service failure in the browser is reported as a browser problem, not saved', async () => {
  const pushManager = fakeBrowser()
  pushManager.subscribe.mockRejectedValue(new Error('Registration failed - push service error'))

  await expect(enableNotifications()).rejects.toBeInstanceOf(BrowserPushError)
  expect(rpc).not.toHaveBeenCalled()
})
