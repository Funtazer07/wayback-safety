import { fireEvent, render, screen } from '@testing-library/react'
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
  render(<WalkScreen walk={walk} />)
  expect(screen.getByRole('timer')).toHaveAccessibleName('20 min left')

  lockPhoneUntil('2026-10-06T22:12:00')

  expect(screen.getByRole('timer')).toHaveAccessibleName('8 min left')
  expect(screen.getByText('08:00')).toBeInTheDocument()
})

test('says the time is up when the phone is unlocked after the deadline', () => {
  render(<WalkScreen walk={walk} />)

  lockPhoneUntil('2026-10-06T22:25:00')

  expect(screen.getByRole('timer')).toHaveAccessibleName('Time is up')
  expect(screen.getByText('Time is up')).toBeInTheDocument()
})

test('sends a fresh location when the phone is unlocked', () => {
  const getCurrentPosition = vi.fn()
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  render(<WalkScreen walk={walk} />)
  expect(getCurrentPosition).toHaveBeenCalledTimes(1)

  lockPhoneUntil('2026-10-06T22:12:00')

  expect(getCurrentPosition).toHaveBeenCalledTimes(2)
})
