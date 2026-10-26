import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import AccountScreen from './AccountScreen.tsx'

const { logOut } = vi.hoisted(() => ({ logOut: vi.fn() }))
const notifications = vi.hoisted(() => ({
  checkNotifications: vi.fn(),
  enableNotifications: vi.fn(),
  disableNotifications: vi.fn(),
}))

vi.mock('../auth/auth.ts', () => ({ logOut }))
// The browser parts have their own tests in notifications.test.ts.
vi.mock('../notifications/notifications.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../notifications/notifications.ts')>()),
  ...notifications,
}))

beforeEach(() => {
  logOut.mockReset().mockResolvedValue(undefined)
  notifications.checkNotifications.mockReset().mockResolvedValue('on')
  notifications.enableNotifications.mockReset()
  notifications.disableNotifications.mockReset().mockResolvedValue(undefined)
})

test('turning off notifications brings back the card to turn them on', async () => {
  render(<AccountScreen displayName="Anna" onLoggingOut={vi.fn()} />)
  expect(await screen.findByText('Notifications are on for this phone.')).toBeInTheDocument()

  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Turn off notifications' })),
  )

  expect(notifications.disableNotifications).toHaveBeenCalledOnce()
  expect(await screen.findByRole('button', { name: 'Allow notifications' })).toBeInTheDocument()
})

test('allowing notifications shows at once that they are on, without reopening the app', async () => {
  notifications.checkNotifications.mockResolvedValue('off')
  notifications.enableNotifications.mockResolvedValue('on')
  render(<AccountScreen displayName="Anna" onLoggingOut={vi.fn()} />)

  const button = await screen.findByRole('button', { name: 'Allow notifications' })
  await act(async () => fireEvent.click(button))

  expect(screen.getByText('Notifications are on for this phone.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Turn off notifications' })).toBeInTheDocument()
  // Only checked once, when the tab opened: the answer came from the tap itself.
  expect(notifications.checkNotifications).toHaveBeenCalledOnce()
})

test('turning off notifications says so when it fails, and keeps the button', async () => {
  notifications.disableNotifications.mockRejectedValue(new Error('Network error'))
  render(<AccountScreen displayName="Anna" onLoggingOut={vi.fn()} />)

  const button = await screen.findByRole('button', { name: 'Turn off notifications' })
  await act(async () => fireEvent.click(button))

  expect(screen.getByRole('alert')).toHaveTextContent('Could not turn off notifications.')
  expect(screen.getByRole('button', { name: 'Turn off notifications' })).toBeEnabled()
})

test('logging out first stops the alerts on this phone, then signs out', async () => {
  const order: string[] = []
  notifications.disableNotifications.mockImplementation(async () => order.push('alerts off'))
  logOut.mockImplementation(async () => order.push('signed out'))
  const onLoggingOut = vi.fn()
  render(<AccountScreen displayName="Anna" onLoggingOut={onLoggingOut} />)

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Log out' })))

  expect(order).toEqual(['alerts off', 'signed out'])
  expect(onLoggingOut).toHaveBeenCalledWith(true)
})

test('logging out still happens when the alerts could not be stopped, and the app is told', async () => {
  notifications.disableNotifications.mockRejectedValue(new Error('Network error'))
  const onLoggingOut = vi.fn()
  render(<AccountScreen displayName="Anna" onLoggingOut={onLoggingOut} />)

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Log out' })))

  expect(onLoggingOut).toHaveBeenCalledWith(false)
  expect(logOut).toHaveBeenCalledOnce()
})
