import { expect, test } from 'vitest'
import {
  audienceOf,
  formatClock,
  isReminderCurrent,
  isSubscriptionGone,
  isWalkEvent,
  messageFor,
  recipientsOf,
  timeToLive,
  type WalkFacts,
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
const walk: WalkFacts = {
  id: 'walk-1',
  deadline: new Date('2026-10-15T20:36:00Z'),
  checkedInAt: null,
  cancelledAt: null,
  overdueAt: null,
  lastLocationAt: null,
}

test('a started walk tells the contact who and when they should be home, without a location', () => {
  const message = messageFor('started', 'Anna', walk)

  expect(message).toEqual({
    title: 'Anna is on the way home',
    body: 'Expected home at 22:36.',
    url: '?walk=walk-1',
  })
})

test('a check-in tells the contact who arrived and when', () => {
  const message = messageFor('home_safe', 'Anna', {
    ...walk,
    checkedInAt: new Date('2026-10-15T20:31:00Z'),
  })

  expect(message).toEqual({
    title: 'Anna has arrived safely',
    body: 'Checked in at 22:31.',
    url: '?walk=walk-1',
  })
})

test('a cancelled walk tells the contact when, and that no check-in will follow', () => {
  const message = messageFor('cancelled', 'Anna', {
    ...walk,
    cancelledAt: new Date('2026-10-15T20:20:00Z'),
  })

  expect(message).toEqual({
    title: 'Anna stopped the walk',
    body: 'Cancelled at 22:20. No check-in will follow.',
    url: '?walk=walk-1',
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
  expect(isWalkEvent('overdue')).toBe(true)
  expect(isWalkEvent('alarm')).toBe(false)
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
  expect(message.body).toContain('your contacts are told in 3 minutes')
})

test('"Are you OK?" is only worth delivering during the grace period', () => {
  expect(timeToLive('are_you_ok')).toBe(3 * 60)
  expect(timeToLive('started')).toBe(60 * 60)
})

// Late: due at 22:36, last location sent at 22:31, overdue at 22:42.
const overdueWalk: WalkFacts = {
  ...walk,
  overdueAt: new Date('2026-10-15T20:42:00Z'),
  lastLocationAt: new Date('2026-10-15T20:31:00Z'),
}

test('the alert says who missed the check-in, without causing panic, and goes to the contacts', () => {
  const message = messageFor('overdue', 'Anna', overdueWalk)

  expect(audienceOf('overdue')).toBe('contacts')
  expect(message.title).toBe("Anna hasn't checked in yet")
  expect(message.body).toContain('Anna was expected home at 22:36')
  expect(message.body).toContain('This does not necessarily mean something is wrong.')
})

test('the alert gives the time of the last known location and says it is not live', () => {
  expect(messageFor('overdue', 'Anna', overdueWalk).body).toContain(
    'Last known location from 22:31, not live.',
  )
})

test('the alert says so when no location was shared, instead of pointing to one', () => {
  const body = messageFor('overdue', 'Anna', { ...overdueWalk, lastLocationAt: null }).body

  expect(body).toContain('No location was shared during this walk.')
  expect(body).not.toContain('Last known location')
})

test('tapping any message to a contact opens the app on this walk', () => {
  expect(messageFor('overdue', 'Anna', overdueWalk).url).toBe('?walk=walk-1')
  expect(messageFor('started', 'Anna', walk).url).toBe('?walk=walk-1')
  expect(messageFor('home_safe', 'Anna', overdueWalk).url).toBe('?walk=walk-1')
  expect(messageFor('cancelled', 'Anna', walk).url).toBe('?walk=walk-1')
})

test('a check-in after the alert tells the contacts clearly that the person is safe', () => {
  const message = messageFor('home_safe', 'Anna', {
    ...overdueWalk,
    checkedInAt: new Date('2026-10-15T20:44:00Z'),
  })

  expect(message.title).toBe('Anna is safe')
  expect(message.body).toContain('checked in at 22:44, after the missed check-in alert')
})

test('the alert is kept for a day for a phone that is off', () => {
  expect(timeToLive('overdue')).toBe(24 * 60 * 60)
})

test('the pre-deadline reminder goes only to the walker and opens the time review', () => {
  expect(isWalkEvent('reminder')).toBe(true)
  expect(audienceOf('reminder')).toBe('walker')
  expect(messageFor('reminder', 'Anna', walk)).toEqual({
    title: 'Need more time?',
    body: 'Your check-in is due at 22:36. Open WayBack to add time or say you’re home.',
    url: '?reminder=walk-1',
  })
})

test('a reminder expires at the deadline, never five minutes after sending', () => {
  const now = new Date('2026-10-15T20:35:30Z')
  expect(timeToLive('reminder', walk.deadline, now)).toBe(30)
  expect(timeToLive('reminder', walk.deadline, new Date('2026-10-15T20:34:00Z'))).toBe(60)
  expect(timeToLive('reminder', walk.deadline, walk.deadline)).toBe(0)
  expect(timeToLive('reminder')).toBe(0)
})

test('a queued reminder is sent only in the last minute of the same active deadline', () => {
  const now = new Date('2026-10-15T20:35:30Z')
  const queued = walk.deadline.toISOString()
  expect(isReminderCurrent('active', walk.deadline, queued, now)).toBe(true)
  expect(isReminderCurrent('active', new Date('2026-10-15T20:46:00Z'), queued, now)).toBe(false)
  expect(isReminderCurrent('active', walk.deadline, queued, walk.deadline)).toBe(false)
  expect(isReminderCurrent('active', walk.deadline, queued, new Date('2026-10-15T20:34:59Z'))).toBe(
    false,
  )
  expect(isReminderCurrent('active', walk.deadline, 'invalid', now)).toBe(false)
  expect(isReminderCurrent('active', walk.deadline, undefined, now)).toBe(false)
})

test.each(['safe', 'cancelled', 'overdue'])('a %s walk receives no reminder', (status) => {
  const now = new Date('2026-10-15T20:35:30Z')
  expect(isReminderCurrent(status, walk.deadline, walk.deadline.toISOString(), now)).toBe(false)
})
