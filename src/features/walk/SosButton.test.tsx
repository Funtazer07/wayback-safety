import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import SosButton from './SosButton.tsx'

afterEach(() => vi.useRealTimers())

test('opening and cancelling SOS never sends an alert', () => {
  const send = vi.fn()
  render(<SosButton onSend={send} />)
  fireEvent.click(screen.getByRole('button', { name: 'SOS' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(send).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('SOS requires three seconds of continuous holding and resets on release', async () => {
  vi.useFakeTimers()
  const send = vi.fn().mockResolvedValue(undefined)
  render(<SosButton onSend={send} />)
  fireEvent.click(screen.getByRole('button', { name: 'SOS' }))
  const hold = screen.getByRole('button', { name: 'Hold for 3 seconds to send SOS' })
  fireEvent.keyDown(hold, { key: ' ' })
  act(() => vi.advanceTimersByTime(2000))
  fireEvent.keyUp(hold, { key: ' ' })
  act(() => vi.advanceTimersByTime(4000))
  expect(send).not.toHaveBeenCalled()
  fireEvent.keyDown(hold, { key: ' ' })
  act(() => vi.advanceTimersByTime(2990))
  expect(send).not.toHaveBeenCalled()
  await act(async () => vi.advanceTimersByTime(50))
  expect(send).toHaveBeenCalledOnce()
})
