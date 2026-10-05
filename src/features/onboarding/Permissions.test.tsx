import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Permissions from './Permissions.tsx'

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('explains location and notifications before the phone asks', () => {
  render(<Permissions onNext={() => {}} />)

  expect(screen.getByRole('heading', { name: 'Location' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
})

test('allowing location makes the phone ask, then continues', async () => {
  const getCurrentPosition = vi.fn((onAllowed: () => void) => onAllowed())
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  const onNext = vi.fn()
  render(<Permissions onNext={onNext} />)

  click('Allow location while using the app')

  await vi.waitFor(() => expect(onNext).toHaveBeenCalled())
  expect(getCurrentPosition).toHaveBeenCalled()
})

test('continues when the user blocks location', async () => {
  const getCurrentPosition = vi.fn((_onAllowed: () => void, onBlocked: () => void) => onBlocked())
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  const onNext = vi.fn()
  render(<Permissions onNext={onNext} />)

  click('Allow location while using the app')

  await vi.waitFor(() => expect(onNext).toHaveBeenCalled())
})

test('"Not now" continues without asking', () => {
  const getCurrentPosition = vi.fn()
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  const onNext = vi.fn()
  render(<Permissions onNext={onNext} />)

  click('Not now')

  expect(onNext).toHaveBeenCalled()
  expect(getCurrentPosition).not.toHaveBeenCalled()
})
