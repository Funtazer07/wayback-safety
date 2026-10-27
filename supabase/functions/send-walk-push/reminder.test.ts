import { expect, test } from 'vitest'
import { isReminderCurrent } from './walkPush.ts'

const deadline = new Date('2026-10-26T21:30:00Z')
const now = new Date('2026-10-26T21:29:00Z')

test('a queued reminder is useful in the last minute of its active deadline', () => {
  expect(isReminderCurrent('active', deadline, deadline.toISOString(), now)).toBe(true)
})

test('a delayed request for the old deadline is discarded after an extension', () => {
  expect(
    isReminderCurrent('active', new Date('2026-10-26T21:40:00Z'), deadline.toISOString(), now),
  ).toBe(false)
})

test.each(['safe', 'cancelled', 'overdue'])('a %s walk receives no reminder', (status) => {
  expect(isReminderCurrent(status, deadline, deadline.toISOString(), now)).toBe(false)
})

test('expired, premature and malformed reminders are discarded', () => {
  expect(isReminderCurrent('active', deadline, deadline.toISOString(), deadline)).toBe(false)
  expect(
    isReminderCurrent('active', deadline, deadline.toISOString(), new Date('2026-10-26T21:28:59Z')),
  ).toBe(false)
  expect(isReminderCurrent('active', deadline, 'invalid', now)).toBe(false)
  expect(isReminderCurrent('active', deadline, undefined, now)).toBe(false)
})
