import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import AccountLocation from './AccountLocation.tsx'

afterEach(() => vi.unstubAllGlobals())

function permissionsAnswer(state: PermissionState) {
  return {
    query: vi.fn().mockResolvedValue({
      state,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  }
}

test('an insecure phone link explains HTTPS instead of claiming location was enabled', () => {
  vi.stubGlobal('isSecureContext', false)
  render(<AccountLocation />)
  fireEvent.click(screen.getByRole('button', { name: 'Allow my location' }))
  expect(screen.getByRole('status')).toHaveTextContent('Open WayBack using HTTPS')
})

test('the button requests actual location access and then says location is on', () => {
  vi.stubGlobal('isSecureContext', true)
  const getCurrentPosition = vi.fn((success: PositionCallback) =>
    success({} as GeolocationPosition),
  )
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  render(<AccountLocation />)
  expect(getCurrentPosition).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Allow my location' }))
  expect(getCurrentPosition).toHaveBeenCalledOnce()
  expect(screen.getByRole('status')).toHaveTextContent('Location is on for WayBack.')
  expect(screen.queryByRole('button', { name: 'Allow my location' })).not.toBeInTheDocument()
})

test('location that is already allowed shows as on, without an Allow button', async () => {
  vi.stubGlobal('navigator', { permissions: permissionsAnswer('granted') })
  render(<AccountLocation />)
  expect(await screen.findByText('Location is on for WayBack.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Allow my location' })).not.toBeInTheDocument()
})

test('location blocked in the phone settings is explained next to the button', async () => {
  vi.stubGlobal('navigator', { permissions: permissionsAnswer('denied') })
  render(<AccountLocation />)
  expect(await screen.findByText(/Location is blocked/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Allow my location' })).toBeInTheDocument()
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
