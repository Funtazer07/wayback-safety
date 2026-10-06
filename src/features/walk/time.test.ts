import { expect, test } from 'vitest'
import { addMinutes, formatClock, minutesUntil } from './time.ts'

test('rounds up to whole minutes', () => {
  const now = new Date('2026-10-06T22:00:00')
  const deadline = new Date('2026-10-06T22:10:30')

  expect(minutesUntil(deadline, now)).toBe(11)
})

test('never goes below zero after the deadline', () => {
  const now = new Date('2026-10-06T22:30:00')
  const deadline = new Date('2026-10-06T22:10:00')

  expect(minutesUntil(deadline, now)).toBe(0)
})

test('shows the arrival time on a 24-hour clock', () => {
  const start = new Date('2026-10-06T23:20:00')

  expect(formatClock(addMinutes(start, 20))).toBe('23:40')
})
