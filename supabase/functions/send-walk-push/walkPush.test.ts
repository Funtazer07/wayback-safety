import { expect, test } from 'vitest'
import {
  audienceOf,
  formatClock,
  isSubscriptionGone,
  isWalkEvent,
  messageFor,
  recipientsOf,
  timeToLive,
} from './walkPush.ts'

test('only contacts who accepted and are not paused get a message', () => {
  expect(
    recipientsOf([
      { contactUserId: 'mum', status: 'accepted' },
      { contactUserId: 'alex', status: 'paused' },
      { contactUserId: null, status: 'invited' },
      { contactUserId: 'sam', status: 'accepted' },
    ]),
  ).toEqual(['mum', 'sam'])
})

test('a contact linked twice gets one message', () => {
  expect(
    recipientsOf([
      { contactUserId: 'mum', status: 'accepted' },
      { contactUserId: 'mum', status: 'accepted' },
    ]),
  ).toEqual(['mum'])
})

test('a walk without contacts sends nothing', () => {
  expect(recipientsOf([])).toEqual([])
})

test('times are shown in Eindhoven time, also in summer', () => {
  // 20:36 UTC is 22:36 in Eindhoven in October (summer time) and 21:36 in winter.
  expect(formatClock(new Date('2026-10-15T20:36:00Z'))).toBe('22:36')
  expect(formatClock(new Date('2026-12-15T20:36:00Z'))).toBe('21:36')
})

// A walk from Stratumseind, to be home by 22:36 Eindhoven time.
const walk = {
  deadline: new Date('2026-10-15T20:36:00Z'),
  checkedInAt: null,
  cancelledAt: null,
}

test('a started walk tells the contact who and when they should be home, without a location', () => {
  const message = messageFor('started', 'Anna', walk)

  expect(message).toEqual({
    title: 'Anna is on the way home',
    body: 'Expected home at 22:36.',
  })
})

test('a check-in tells the contact who arrived and when', () => {
  const message = messageFor('home_safe', 'Anna', {
    ...walk,
    checkedInAt: new Date('2026-10-15T20:31:00Z'),
  })

  expect(message).toEqual({ title: 'Anna has arrived safely', body: 'Checked in at 22:31.' })
})

test('a cancelled walk tells the contact when, and that no check-in will follow', () => {
  const message = messageFor('cancelled', 'Anna', {
    ...walk,
    cancelledAt: new Date('2026-10-15T20:20:00Z'),
  })

  expect(message).toEqual({
    title: 'Anna stopped the walk',
    body: 'Cancelled at 22:20. No check-in will follow.',
  })
})

test('a user without a name is still announced', () => {
  expect(messageFor('started', null, walk).title).toBe('Your contact is on the way home')
  expect(messageFor('started', '  ', walk).title).toBe('Your contact is on the way home')
})

test('only the known events are accepted', () => {
  expect(isWalkEvent('started')).toBe(true)
  expect(isWalkEvent('home_safe')).toBe(true)
  expect(isWalkEvent('cancelled')).toBe(true)
  expect(isWalkEvent('are_you_ok')).toBe(true)
  expect(isWalkEvent('overdue')).toBe(false)
  expect(isWalkEvent(undefined)).toBe(false)
})

test('a phone that removed its subscription is recognised by the push service answer', () => {
  expect(isSubscriptionGone(410)).toBe(true)
  expect(isSubscriptionGone(404)).toBe(true)
  expect(isSubscriptionGone(429)).toBe(false)
  expect(isSubscriptionGone(undefined)).toBe(false)
})

test('"Are you OK?" goes to the walker; everything else to the contacts', () => {
  expect(audienceOf('are_you_ok')).toBe('walker')
  expect(audienceOf('started')).toBe('contacts')
  expect(audienceOf('home_safe')).toBe('contacts')
  expect(audienceOf('cancelled')).toBe('contacts')
})

test('"Are you OK?" tells the walker what to do and when the contacts are told', () => {
  const message = messageFor('are_you_ok', 'Anna', walk)

  expect(message.title).toBe('Are you OK?')
  expect(message.body).toContain('say you are home or add time')
  expect(message.body).toContain('your contacts are told in 5 minutes')
})

test('"Are you OK?" is only worth delivering during the grace period', () => {
  expect(timeToLive('are_you_ok')).toBe(5 * 60)
  expect(timeToLive('started')).toBe(60 * 60)
})
