import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import StartWalkScreen from './StartWalkScreen.tsx'

vi.mock('../contacts/useContacts.ts', () => ({
  useContacts: () => ({ contacts: [], isLoading: false }),
}))
const notifications = vi.hoisted(() => ({ state: 'on', enable: vi.fn() }))
vi.mock('../notifications/useNotifications.ts', () => ({
  useNotifications: () => ({
    notificationState: notifications.state,
    isLoading: false,
    error: null,
    enable: notifications.enable,
    disable: vi.fn(),
  }),
}))

beforeEach(() => {
  notifications.state = 'on'
  notifications.enable.mockReset()
})

test('starting a walk asks for notifications when they are off, without waiting for the answer', () => {
  notifications.state = 'off'
  notifications.enable.mockReturnValue(new Promise(() => {}))
  const onStart = vi.fn().mockResolvedValue(undefined)
  render(<StartWalkScreen userId="test" onStart={onStart} onBack={vi.fn()} />)

  expect(screen.queryByRole('button', { name: 'Allow notifications' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Start walk' }))

  expect(notifications.enable).toHaveBeenCalledOnce()
  expect(onStart).toHaveBeenCalledOnce()
})

test('starting a walk does not ask again when notifications are already on', () => {
  render(
    <StartWalkScreen
      userId="test"
      onStart={vi.fn().mockResolvedValue(undefined)}
      onBack={vi.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Start walk' }))
  expect(notifications.enable).not.toHaveBeenCalled()
})

test('blocked notifications are explained instead of asked for', () => {
  notifications.state = 'blocked'
  render(<StartWalkScreen userId="test" onStart={vi.fn()} onBack={vi.fn()} />)
  expect(screen.getByText(/You can allow them in your phone’s settings/)).toBeInTheDocument()
})

test.each([14 * 60, 17 * 60, 17 * 60 + 10])(
  'the route duration of %i seconds sets the initial timer and is sent when starting',
  async (seconds) => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    render(
      <StartWalkScreen
        userId="test"
        plannedRoute={{ coordinates: [], seconds, metres: 1400, destinationLabel: 'Home' }}
        onStart={onStart}
        onBack={vi.fn()}
      />,
    )
    const minutes = Math.ceil(seconds / 60)
    expect(screen.getByText(`${minutes} min`, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(`${minutes} min walk · 1.4 km`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start walk' }))
    expect(onStart).toHaveBeenCalledWith({ destinationLabel: 'Home', minutes, contactIds: [] })
  },
)
