import { expect, test } from 'vitest'
import { reportAge } from './reportAge.ts'

const now = new Date('2026-11-18T23:00:00')

function minutesBefore(minutes: number) {
  return new Date(now.getTime() - minutes * 60_000)
}

test('a report from the last minute is "just now"', () => {
  expect(reportAge(minutesBefore(0.5), now)).toBe('just now')
})

test('a report from the last hour says how many minutes old it is', () => {
  expect(reportAge(minutesBefore(1), now)).toBe('1 minute ago')
  expect(reportAge(minutesBefore(25), now)).toBe('25 minutes ago')
})

test('a report from today says how many hours old it is', () => {
  expect(reportAge(minutesBefore(60), now)).toBe('1 hour ago')
  expect(reportAge(minutesBefore(5 * 60 + 30), now)).toBe('5 hours ago')
})

test('an older report says how many days old it is', () => {
  expect(reportAge(minutesBefore(26 * 60), now)).toBe('yesterday')
  expect(reportAge(minutesBefore(3 * 24 * 60), now)).toBe('3 days ago')
})

test('a clock that is slightly behind never makes a report from the future', () => {
  expect(reportAge(new Date(now.getTime() + 30_000), now)).toBe('just now')
})
