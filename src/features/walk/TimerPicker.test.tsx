import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import TimerPicker from './TimerPicker.tsx'

const now = new Date('2026-10-26T22:06:00')
const range = { min: 12, max: 60 }
const presets = [17, 22, 27, 32]

function renderPicker(minutes = 17, onChange = vi.fn()) {
  render(
    <TimerPicker minutes={minutes} onChange={onChange} range={range} presets={presets} now={now} />,
  )
  return onChange
}

test('the slider moves the timer by the minute, within the range of the route', () => {
  const onChange = renderPicker()

  const slider = screen.getByRole('slider', { name: 'Walk timer in minutes' })
  expect(slider).toHaveAttribute('min', '12')
  expect(slider).toHaveAttribute('max', '60')
  expect(slider).toHaveAttribute('aria-valuetext', '17 min, check in by 22:23')
  fireEvent.change(slider, { target: { value: '23' } })

  expect(onChange).toHaveBeenCalledWith(23)
})

test('− and + change the timer by one minute, and stop at the ends', () => {
  const onChange = renderPicker(12)

  expect(screen.getByRole('button', { name: '1 minute less' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '1 minute more' }))

  expect(onChange).toHaveBeenCalledWith(13)
})

test('a quick choice sets the timer, and the chosen one is marked', () => {
  const onChange = renderPicker(22)

  expect(screen.getByRole('button', { name: '22 min' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: '32 min' }))

  expect(onChange).toHaveBeenCalledWith(32)
})

test('the user sees when to check in, as on screen 04', () => {
  renderPicker(20)

  expect(screen.getByText('Check in by 22:26')).toBeInTheDocument()
})
