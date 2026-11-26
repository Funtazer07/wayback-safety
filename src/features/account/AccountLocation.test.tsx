import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import AccountLocation from './AccountLocation.tsx'

afterEach(() => vi.unstubAllGlobals())

test('an insecure phone link explains HTTPS instead of claiming location was enabled', () => {
  vi.stubGlobal('isSecureContext', false)
  render(<AccountLocation />)
  fireEvent.click(screen.getByRole('button', { name: 'Allow my location' }))
  expect(screen.getByRole('status')).toHaveTextContent('Open WayBack using HTTPS')
})

test('the button requests actual location access and reports success without storing coordinates', () => {
  vi.stubGlobal('isSecureContext', true)
  const getCurrentPosition = vi.fn((success: PositionCallback) =>
    success({} as GeolocationPosition),
  )
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  render(<AccountLocation />)
  expect(getCurrentPosition).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Allow my location' }))
  expect(getCurrentPosition).toHaveBeenCalledOnce()
  expect(screen.getByRole('status')).toHaveTextContent('Location access is available')
})

test('denied access gives a recoverable instruction instead of a success message', () => {
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    },
  })
  render(<AccountLocation />)
  fireEvent.click(screen.getByRole('button', { name: 'Allow my location' }))
  expect(screen.getByRole('status')).toHaveTextContent('Location is blocked')
})
