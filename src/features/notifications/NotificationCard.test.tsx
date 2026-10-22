import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import NotificationCard from './NotificationCard.tsx'
import { BrowserPushError } from './notifications.ts'

const { checkNotifications, enableNotifications } = vi.hoisted(() => ({
  checkNotifications: vi.fn(),
  enableNotifications: vi.fn(),
}))

// The browser parts have their own tests in notifications.test.ts. BrowserPushError stays real, so
// the card can tell the two kinds of failure apart.
vi.mock('./notifications.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./notifications.ts')>()),
  checkNotifications,
  enableNotifications,
}))

const reason = 'WayBack can then warn you if your timer runs out.'

beforeEach(() => {
  checkNotifications.mockReset()
  enableNotifications.mockReset()
})

test('the card asks for notifications and disappears once they are on', async () => {
  checkNotifications.mockResolvedValue('off')
  enableNotifications.mockResolvedValue('on')
  render(<NotificationCard reason={reason} />)

  expect(await screen.findByText(reason)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Allow notifications' }))

  await vi.waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Turn on notifications' }),
    ).not.toBeInTheDocument(),
  )
})

test('the card points to the phone settings when notifications are blocked', async () => {
  checkNotifications.mockResolvedValue('blocked')
  render(<NotificationCard reason={reason} />)

  expect(await screen.findByText(/allow them in your phone’s settings/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Allow notifications' })).not.toBeInTheDocument()
})

test('the card explains that an iPhone needs the app on the Home Screen', async () => {
  checkNotifications.mockResolvedValue('needs-install')
  render(<NotificationCard reason={reason} />)

  expect(await screen.findByText(/add WayBack to your Home Screen/)).toBeInTheDocument()
})

test('the card is not shown when notifications are already on', async () => {
  checkNotifications.mockResolvedValue('on')
  render(<NotificationCard reason={reason} />)

  await vi.waitFor(() => expect(checkNotifications).toHaveBeenCalled())
  expect(screen.queryByRole('heading', { name: 'Turn on notifications' })).not.toBeInTheDocument()
})

test('the card says so when turning on notifications fails', async () => {
  checkNotifications.mockResolvedValue('off')
  enableNotifications.mockRejectedValue(new Error('Network error'))
  render(<NotificationCard reason={reason} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Allow notifications' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not turn on notifications.')
  expect(screen.getByRole('button', { name: 'Allow notifications' })).toBeEnabled()
})
