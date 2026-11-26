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

test('a long touch that opens the context menu does not reset the SOS hold', async () => {
  vi.useFakeTimers()
  const send = vi.fn().mockResolvedValue(undefined)
  render(<SosButton onSend={send} />)
  fireEvent.click(screen.getByRole('button', { name: 'SOS' }))
  const hold = screen.getByRole('button', { name: 'Hold for 3 seconds to send SOS' })
  fireEvent.keyDown(hold, { key: ' ' })
  act(() => vi.advanceTimersByTime(500))
  fireEvent.contextMenu(hold)
  await act(async () => vi.advanceTimersByTime(2600))
  expect(send).toHaveBeenCalledOnce()
})

test('an SOS the server refuses for lack of contacts says how to fix it', async () => {
  vi.useFakeTimers()
  const send = vi
    .fn()
    .mockRejectedValue({ message: 'Add an accepted trusted contact before sending SOS' })
  render(<SosButton onSend={send} />)
  fireEvent.click(screen.getByRole('button', { name: 'SOS' }))
  fireEvent.keyDown(screen.getByRole('button', { name: 'Hold for 3 seconds to send SOS' }), {
    key: ' ',
  })
  await act(async () => vi.advanceTimersByTime(3100))
  expect(screen.getByRole('alert')).toHaveTextContent('Add a trusted contact')
})

test('an SOS that fails for another reason asks to check the connection', async () => {
  vi.useFakeTimers()
  const send = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
  render(<SosButton onSend={send} />)
  fireEvent.click(screen.getByRole('button', { name: 'SOS' }))
  fireEvent.keyDown(screen.getByRole('button', { name: 'Hold for 3 seconds to send SOS' }), {
    key: ' ',
  })
  await act(async () => vi.advanceTimersByTime(3100))
  expect(screen.getByRole('alert')).toHaveTextContent('Check your connection')
})
