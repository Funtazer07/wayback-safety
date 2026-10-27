import { expect, test } from 'vitest'
import {
  addMinutes,
  formatClock,
  formatCountdown,
  formatDuration,
  minutesUntil,
  secondsUntil,
  timeLeftShare,
  timerPhase,
} from './time.ts'

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

test('counts down in minutes and seconds', () => {
  const now = new Date('2026-10-06T22:00:00')

  expect(secondsUntil(new Date('2026-10-06T22:12:05'), now)).toBe(725)
  expect(formatCountdown(725)).toBe('12:05')
  expect(formatCountdown(0)).toBe('00:00')
})

test('shows hours once the countdown is an hour or longer', () => {
  expect(formatCountdown(3725)).toBe('1:02:05')
})

test('the ring empties from the start of the walk to the deadline', () => {
  const startedAt = new Date('2026-10-06T22:00:00')
  const deadline = new Date('2026-10-06T22:20:00')

  expect(timeLeftShare(startedAt, deadline, startedAt)).toBe(1)
  expect(timeLeftShare(startedAt, deadline, new Date('2026-10-06T22:15:00'))).toBe(0.25)
  expect(timeLeftShare(startedAt, deadline, new Date('2026-10-06T22:30:00'))).toBe(0)
})

test('warns in the last five minutes and when time is up', () => {
  const deadline = new Date('2026-10-06T22:20:00')

  expect(timerPhase(deadline, new Date('2026-10-06T22:14:59'))).toBe('on-time')
  expect(timerPhase(deadline, new Date('2026-10-06T22:15:00'))).toBe('almost-up')
  expect(timerPhase(deadline, new Date('2026-10-06T22:20:00'))).toBe('time-up')
})

test('shows a timer under an hour in minutes', () => {
  expect(formatDuration(35)).toBe('35 min')
})

test('shows a timer from an hour up in hours and minutes', () => {
  expect(formatDuration(95)).toBe('1 h 35 min')
})

test('leaves the minutes out on a whole hour', () => {
  expect(formatDuration(120)).toBe('2 h')
})

// The pre-deadline push is separate from the timer's five-minute colour warning.
test('the reminder starts at one minute and ends exactly at the deadline', async () => {
  const { isReminderDue } = await import('./time.ts')
  const deadline = new Date('2026-10-27T22:00:00Z')
  expect(isReminderDue(deadline, new Date('2026-10-27T21:58:59.999Z'))).toBe(false)
  expect(isReminderDue(deadline, new Date('2026-10-27T21:59:00Z'))).toBe(true)
  expect(isReminderDue(deadline, new Date('2026-10-27T21:59:59Z'))).toBe(true)
  expect(isReminderDue(deadline, deadline)).toBe(false)
})
