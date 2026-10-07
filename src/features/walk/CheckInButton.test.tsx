import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import CheckInButton from './CheckInButton.tsx'

test('checks in with one tap on the home button', () => {
  const onCheckIn = vi.fn()
  render(<CheckInButton onCheckIn={onCheckIn} />)

  fireEvent.click(screen.getByRole('button', { name: 'I’m home' }))

  expect(onCheckIn).toHaveBeenCalledOnce()
})

test('prevents a second check-in when the button is disabled', () => {
  const onCheckIn = vi.fn()
  render(<CheckInButton onCheckIn={onCheckIn} disabled />)

  const button = screen.getByRole('button', { name: 'I’m home' })
  expect(button).toBeDisabled()
  fireEvent.click(button)

  expect(onCheckIn).not.toHaveBeenCalled()
})
