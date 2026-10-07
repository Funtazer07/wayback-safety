import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Walk } from './walk.ts'
import WalkScreen from './WalkScreen.tsx'

vi.mock('../../lib/supabase.ts', () => ({ supabase: null }))
// The map needs a real browser; it has its own tests in features/map.
vi.mock('../map/CityMap.tsx', () => ({ default: () => null }))

const walk: Walk = {
  id: 'walk-1',
  destinationLabel: 'Home',
  startedAt: new Date('2026-10-06T22:00:00'),
  deadline: new Date('2026-10-06T22:20:00'),
  status: 'active',
}

// A locked phone stops the timers of the page while the clock keeps going. The tests copy that:
// they move the clock without running the timers, then tell the page it is on screen again.
function lockPhoneUntil(time: string) {
  vi.setSystemTime(new Date(time))
  fireEvent(document, new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-06T22:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('the time left is right again as soon as the phone is unlocked', () => {
  render(<WalkScreen walk={walk} onCheckIn={vi.fn()} onDone={vi.fn()} />)
  expect(screen.getByRole('timer')).toHaveAccessibleName('20 min left')

  lockPhoneUntil('2026-10-06T22:12:00')

  expect(screen.getByRole('timer')).toHaveAccessibleName('8 min left')
  expect(screen.getByText('08:00')).toBeInTheDocument()
})

test('says the time is up when the phone is unlocked after the deadline', () => {
  render(<WalkScreen walk={walk} onCheckIn={vi.fn()} onDone={vi.fn()} />)

  lockPhoneUntil('2026-10-06T22:25:00')

  expect(screen.getByRole('timer')).toHaveAccessibleName('Time is up')
  expect(screen.getByText('Time is up')).toBeInTheDocument()
})

test('sends a fresh location when the phone is unlocked', () => {
  const getCurrentPosition = vi.fn()
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  render(<WalkScreen walk={walk} onCheckIn={vi.fn()} onDone={vi.fn()} />)
  expect(getCurrentPosition).toHaveBeenCalledTimes(1)

  lockPhoneUntil('2026-10-06T22:12:00')

  expect(getCurrentPosition).toHaveBeenCalledTimes(2)
})

test('the "I’m home" button is there during a walk and checks the user in with one tap', async () => {
  const onCheckIn = vi.fn().mockResolvedValue(undefined)
  render(<WalkScreen walk={walk} onCheckIn={onCheckIn} onDone={vi.fn()} />)

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'I’m home' })))

  expect(onCheckIn).toHaveBeenCalledOnce()
})

test('shows a message and lets the user try again when the check-in fails', async () => {
  const onCheckIn = vi.fn().mockRejectedValue(new Error('network'))
  render(<WalkScreen walk={walk} onCheckIn={onCheckIn} onDone={vi.fn()} />)

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'I’m home' })))

  expect(screen.getByRole('alert')).toHaveTextContent('Could not check you in.')
  expect(screen.getByRole('button', { name: 'I’m home' })).toBeEnabled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('a walk that is checked in shows the confirmation and closes it with OK', () => {
  const onDone = vi.fn()
  render(<WalkScreen walk={{ ...walk, status: 'safe' }} onCheckIn={vi.fn()} onDone={onDone} />)

  expect(screen.getByRole('dialog', { name: 'You arrived safely!' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))

  expect(onDone).toHaveBeenCalledOnce()
})

test('the location is no longer sent after the check-in', () => {
  const getCurrentPosition = vi.fn()
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  const { rerender } = render(<WalkScreen walk={walk} onCheckIn={vi.fn()} onDone={vi.fn()} />)
  expect(getCurrentPosition).toHaveBeenCalledTimes(1)

  rerender(<WalkScreen walk={{ ...walk, status: 'safe' }} onCheckIn={vi.fn()} onDone={vi.fn()} />)
  vi.advanceTimersByTime(5 * 60_000)
  lockPhoneUntil('2026-10-06T22:12:00')

  expect(getCurrentPosition).toHaveBeenCalledTimes(1)
})

test('the countdown stops at the moment of the check-in', async () => {
  let currentWalk = walk
  const onCheckIn = vi.fn(async () => {
    currentWalk = { ...walk, status: 'safe' }
  })
  const { rerender } = render(<WalkScreen walk={walk} onCheckIn={onCheckIn} onDone={vi.fn()} />)
  vi.setSystemTime(new Date('2026-10-06T22:05:00'))

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'I’m home' })))
  rerender(<WalkScreen walk={currentWalk} onCheckIn={onCheckIn} onDone={vi.fn()} />)
  act(() => vi.advanceTimersByTime(3 * 60_000))

  expect(screen.getByText('15:00')).toBeInTheDocument()
})
