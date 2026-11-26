import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { listenForInstallPrompt } from '../../lib/install.ts'
import InstallBanner from './InstallBanner.tsx'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test("without Chrome's install prompt the banner shows the steps", () => {
  vi.stubGlobal('navigator', { userAgent: 'iPhone' })
  render(<InstallBanner />)

  fireEvent.click(screen.getByRole('button', { name: 'Show me how' }))

  expect(screen.getByText('Tap the Share button at the bottom of Safari.')).toBeInTheDocument()
})

test("on Android the Install button opens Chrome's own prompt", async () => {
  listenForInstallPrompt()
  const prompt = vi.fn().mockResolvedValue(undefined)
  const offer = Object.assign(new Event('beforeinstallprompt'), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  })
  render(<InstallBanner />)
  fireEvent(window, offer)

  fireEvent.click(await screen.findByRole('button', { name: 'Install' }))

  expect(prompt).toHaveBeenCalledOnce()
  // Installed, so the banner goes away.
  await waitFor(() => expect(screen.queryByText(/home screen./)).not.toBeInTheDocument())
})

test('Not now hides the banner, also the next time the app opens', () => {
  const { unmount } = render(<InstallBanner />)
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
  expect(screen.queryByText(/home screen./)).not.toBeInTheDocument()

  unmount()
  render(<InstallBanner />)
  expect(screen.queryByText(/home screen./)).not.toBeInTheDocument()
})
