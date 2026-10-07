import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import CheckInConfirmation from './CheckInConfirmation.tsx'

// The fake for the native modal dialog, which jsdom lacks, is in src/setupTests.ts.

test('says the walk has ended without claiming that a message was sent', () => {
  render(<CheckInConfirmation isOpen onClose={vi.fn()} />)

  expect(screen.getByRole('dialog', { name: 'You arrived safely!' })).toBeVisible()
  expect(screen.getByText('Your walk has ended and the timer has stopped.')).toBeVisible()
  expect(screen.getByText('The app no longer saves where you are.')).toBeVisible()
  expect(screen.queryByText(/sent/i)).not.toBeInTheDocument()
})

test('keeps the confirmation hidden until the user checks in', () => {
  render(<CheckInConfirmation isOpen={false} onClose={vi.fn()} />)

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('lets the user dismiss the confirmation with OK or Escape', () => {
  const onClose = vi.fn()
  render(<CheckInConfirmation isOpen onClose={onClose} />)

  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
  expect(onClose).toHaveBeenCalledTimes(1)

  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
  expect(onClose).toHaveBeenCalledTimes(2)
})

test('returns focus to the home button when the confirmation closes', () => {
  const { rerender } = render(
    <>
      <button type="button">I’m home</button>
      <CheckInConfirmation isOpen={false} onClose={vi.fn()} />
    </>,
  )
  const homeButton = screen.getByRole('button', { name: 'I’m home' })
  homeButton.focus()

  rerender(
    <>
      <button type="button">I’m home</button>
      <CheckInConfirmation isOpen onClose={vi.fn()} />
    </>,
  )
  expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus()

  rerender(
    <>
      <button type="button">I’m home</button>
      <CheckInConfirmation isOpen={false} onClose={vi.fn()} />
    </>,
  )
  expect(homeButton).toHaveFocus()
})
