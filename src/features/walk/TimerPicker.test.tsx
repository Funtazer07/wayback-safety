import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import TimerPicker from './TimerPicker.tsx'

const now = new Date('2026-10-26T22:06:00')

test('a quick choice sets the timer, and the chosen one is marked', () => {
  const onChange = vi.fn()
  render(<TimerPicker minutes={20} onChange={onChange} now={now} />)

  expect(screen.getByRole('button', { name: '20 min' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: '30 min' }))

  expect(onChange).toHaveBeenCalledWith(30)
})

test('the user sees when to check in, as on screen 04', () => {
  render(<TimerPicker minutes={20} onChange={vi.fn()} now={now} />)

  expect(screen.getByText('Check in by 22:26')).toBeInTheDocument()
})
