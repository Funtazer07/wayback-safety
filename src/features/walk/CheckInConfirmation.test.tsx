import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import CheckInConfirmation from './CheckInConfirmation.tsx'

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

// jsdom does not implement native modal dialogs. The browser manages their focus trap.
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true
      this.querySelector<HTMLButtonElement>('button')?.focus()
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false
    },
  })
})

afterAll(() => {
  if (originalShowModal) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  }
  if (originalClose) {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  }
})

test('shows the arrival confirmation and clearly labels the SMS as a demo', () => {
  render(<CheckInConfirmation isOpen onClose={vi.fn()} />)

  expect(screen.getByRole('dialog', { name: 'You arrived safely!' })).toBeVisible()
  expect(screen.getByText('SMS sent to “Mum”.')).toBeVisible()
  expect(screen.getByText('Demo only · No SMS was sent.')).toBeVisible()
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
