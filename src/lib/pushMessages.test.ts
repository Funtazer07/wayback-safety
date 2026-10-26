import { afterEach, expect, test, vi } from 'vitest'
import { onPushMessage } from './pushMessages.ts'

// jsdom has no service worker, so a plain event target stands in for navigator.serviceWorker.
function fakeServiceWorker() {
  const serviceWorker = new EventTarget()
  vi.stubGlobal('navigator', { serviceWorker })
  return (data: unknown) =>
    serviceWorker.dispatchEvent(Object.assign(new Event('message'), { data }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('a push passed on by the service worker reaches the screen at once', () => {
  const sendMessage = fakeServiceWorker()
  const onPush = vi.fn()
  onPushMessage(onPush)

  sendMessage({ type: 'wayback-push' })

  expect(onPush).toHaveBeenCalledOnce()
})

test('other messages from the service worker are ignored', () => {
  const sendMessage = fakeServiceWorker()
  const onPush = vi.fn()
  onPushMessage(onPush)

  sendMessage({ type: 'SKIP_WAITING' })
  sendMessage(null)

  expect(onPush).not.toHaveBeenCalled()
})

test('a screen that is closed stops listening', () => {
  const sendMessage = fakeServiceWorker()
  const onPush = vi.fn()
  const stopListening = onPushMessage(onPush)

  stopListening()
  sendMessage({ type: 'wayback-push' })

  expect(onPush).not.toHaveBeenCalled()
})

test('a browser without a service worker does not break', () => {
  vi.stubGlobal('navigator', {})

  expect(() => onPushMessage(vi.fn())()).not.toThrow()
})
