import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Home from './Home.tsx'

vi.mock('../../lib/supabase.ts', () => ({ supabase: { auth: {} } }))

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('the banner opens the install steps for an iPhone', () => {
  vi.stubGlobal('navigator', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
  })
  render(<Home displayName="Sam" onStartWalk={() => {}} />)

  click('Show me how')

  expect(
    screen.getByRole('dialog', { name: 'Add WayBack to your home screen' }),
  ).toBeInTheDocument()
  expect(screen.getByText('Tap the Share button at the bottom of Safari.')).toBeInTheDocument()
  expect(screen.queryByText('Choose "Install app".')).not.toBeInTheDocument()
})

test('other phones get the browser menu steps', () => {
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)' })
  render(<Home displayName="Sam" onStartWalk={() => {}} />)

  click('Show me how')

  expect(screen.getByText('Choose "Install app".')).toBeInTheDocument()
})

test('"Got it" closes the install steps', () => {
  render(<Home displayName="Sam" onStartWalk={() => {}} />)

  click('Show me how')
  click('Got it')

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('the banner is hidden when the app is opened from the home screen', () => {
  vi.stubGlobal('navigator', { userAgent: 'iPhone', standalone: true })

  render(<Home displayName="Sam" onStartWalk={() => {}} />)

  expect(screen.queryByRole('button', { name: 'Show me how' })).not.toBeInTheDocument()
})
