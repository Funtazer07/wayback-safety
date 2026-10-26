import { expect, test } from 'vitest'
import type { ContactWalk } from '../followedWalk/followedWalk.ts'
import { contactStatusText, contactWalkText, initialOf } from './contactStatus.ts'
import type { Contact } from './contacts.ts'

const now = new Date('2026-10-25T22:00:00Z')
const mum: Contact = { id: 'c1', label: 'Mum', status: 'accepted', inviteExpiresAt: null }

test('each contact says in words where the invitation stands', () => {
  expect(contactStatusText(mum, now)).toBe('Invitation accepted')
  expect(contactStatusText({ ...mum, status: 'paused' }, now)).toBe('Updates paused')
  expect(
    contactStatusText(
      { ...mum, status: 'invited', inviteExpiresAt: new Date('2026-10-26T12:00:00Z') },
      now,
    ),
  ).toBe('Invitation pending')
})

test('an invite older than 48 hours is shown as expired', () => {
  expect(
    contactStatusText(
      { ...mum, status: 'invited', inviteExpiresAt: new Date('2026-10-25T21:00:00Z') },
      now,
    ),
  ).toBe('Invitation expired')
})

test('the badge shows the first letter of the name', () => {
  expect(initialOf('mum')).toBe('M')
  expect(initialOf('  Alex')).toBe('A')
  expect(initialOf('')).toBe('?')
})

test('a contact who accepted says whether an alert can reach them', () => {
  expect(contactStatusText({ ...mum, canReceiveAlerts: true }, now)).toBe('Can receive alerts')
  expect(contactStatusText({ ...mum, canReceiveAlerts: false }, now)).toBe(
    'Notifications off: cannot receive alerts',
  )
  // Paused stays paused: that is what matters for the next walk.
  expect(contactStatusText({ ...mum, status: 'paused', canReceiveAlerts: true }, now)).toBe(
    'Updates paused',
  )
})

// A walk by Mum, to be home by 22:36.
const walk: ContactWalk = {
  walkId: 'walk-1',
  walkerName: 'Mum',
  contactId: 'c1',
  status: 'active',
  deadline: new Date('2026-10-26T22:36:00'),
  overdueAt: null,
  checkedInAt: null,
  cancelledAt: null,
}

test('the walk of a contact says in words how it is going, never where they are', () => {
  expect(contactWalkText(walk)).toBe('On the way · home by 22:36')
  expect(contactWalkText({ ...walk, status: 'overdue' })).toBe('Check-in overdue · View walk')
  expect(
    contactWalkText({ ...walk, status: 'safe', checkedInAt: new Date('2026-10-26T22:31:00') }),
  ).toBe('Home safe at 22:31')
  expect(
    contactWalkText({
      ...walk,
      status: 'cancelled',
      cancelledAt: new Date('2026-10-26T22:20:00'),
    }),
  ).toBe('Stopped the walk at 22:20')
})
