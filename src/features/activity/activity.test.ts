import { expect, test } from 'vitest'
import type { ContactWalk } from '../followedWalk/followedWalk.ts'
import { activityFeed, activityTime, activityUpdate } from './activity.ts'

// Anna's walk: started at 22:06, check-in due at 22:26.
const walk: ContactWalk = {
  walkId: 'walk-anna',
  walkerName: 'Anna',
  contactId: 'c-anna',
  status: 'active',
  startedAt: new Date('2026-10-26T22:06:00'),
  deadline: new Date('2026-10-26T22:26:00'),
  overdueAt: null,
  checkedInAt: null,
  cancelledAt: null,
}

test('a walk on the way says who started and when the check-in is due, never where to', () => {
  expect(activityUpdate(walk)).toEqual({
    walkId: 'walk-anna',
    tone: 'walking',
    title: 'Anna started a walk',
    lines: ['Check-in due at 22:26.'],
    at: walk.startedAt,
  })
})

test('a missed check-in says so calmly, without pronouns', () => {
  const update = activityUpdate({
    ...walk,
    status: 'overdue',
    overdueAt: new Date('2026-10-26T22:31:00'),
  })

  expect(update.tone).toBe('overdue')
  expect(update.title).toBe('Anna hasn’t checked in')
  expect(update.lines).toEqual([
    'The check-in was due at 22:26.',
    'This doesn’t necessarily mean something is wrong.',
  ])
  expect(update.at).toEqual(new Date('2026-10-26T22:31:00'))
})

test('an ended walk says it ended, with the check-in or cancel time', () => {
  const safe = activityUpdate({
    ...walk,
    status: 'safe',
    checkedInAt: new Date('2026-10-26T22:24:00'),
  })
  expect(safe.title).toBe('Anna arrived safely')
  expect(safe.lines).toEqual(['The walk ended. Location sharing stopped.'])

  const stopped = activityUpdate({
    ...walk,
    status: 'cancelled',
    cancelledAt: new Date('2026-10-26T22:10:00'),
  })
  expect(stopped.title).toBe('Anna stopped the walk')
  expect(stopped.at).toEqual(new Date('2026-10-26T22:10:00'))
})

test('the newest update comes first', () => {
  const feed = activityFeed([
    walk,
    {
      ...walk,
      walkId: 'walk-sam',
      walkerName: 'Sam',
      status: 'safe',
      checkedInAt: new Date('2026-10-26T22:40:00'),
    },
  ])

  expect(feed.map((update) => update.walkId)).toEqual(['walk-sam', 'walk-anna'])
})

test('the time is a clock today, "Yesterday" the day before, and a date before that', () => {
  const now = new Date('2026-10-27T09:00:00')

  expect(activityTime(new Date('2026-10-27T08:15:00'), now)).toBe('08:15')
  expect(activityTime(new Date('2026-10-26T22:31:00'), now)).toBe('Yesterday')
  expect(activityTime(new Date('2026-10-24T22:31:00'), now)).toBe('24 Oct')
})
