import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import InstallSheet from './InstallSheet.tsx'

afterEach(() => vi.unstubAllGlobals())

test('installation instructions show the iPhone share steps', () => {
  vi.stubGlobal('navigator', { userAgent: 'iPhone' })
  render(<InstallSheet onClose={() => {}} />)
  expect(screen.getByText('Tap the Share button at the bottom of Safari.')).toBeInTheDocument()
})

test('other phones get the browser menu steps', () => {
  vi.stubGlobal('navigator', { userAgent: 'Android' })
  render(<InstallSheet onClose={() => {}} />)
  expect(screen.getByText('Choose "Install app".')).toBeInTheDocument()
})

test('Got it closes the installation instructions', () => {
  const onClose = vi.fn()
  render(<InstallSheet onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
  expect(onClose).toHaveBeenCalledOnce()
})
