import { expect, test } from 'vitest'
import { graceEndsAt, namesInWords, walkPhase } from './grace.ts'
import type { Walk } from './walk.ts'

// A walk home from Stratumseind, due at 22:25.
const walk: Walk = {
  id: 'walk-1',
  destinationLabel: 'Home',
  startedAt: new Date('2026-10-06T22:00:00Z'),
  deadline: new Date('2026-10-06T22:25:00Z'),
  status: 'active',
  warnedAt: null,
}

test('before the deadline the user is walking', () => {
  expect(walkPhase(walk, new Date('2026-10-06T22:24:59Z'))).toBe('walking')
})

test('from the deadline on, an active walk is in its grace period', () => {
  expect(walkPhase(walk, new Date('2026-10-06T22:25:00Z'))).toBe('grace')
  expect(walkPhase(walk, new Date('2026-10-06T22:40:00Z'))).toBe('grace')
})

test('only the server makes a walk overdue', () => {
  expect(walkPhase({ ...walk, status: 'overdue' }, new Date('2026-10-06T22:31:00Z'))).toBe(
    'overdue',
  )
})

test('a checked-in or cancelled walk has ended, also after its deadline', () => {
  const late = new Date('2026-10-06T22:40:00Z')
  expect(walkPhase({ ...walk, status: 'safe' }, late)).toBe('ended')
  expect(walkPhase({ ...walk, status: 'cancelled' }, late)).toBe('ended')
})

test('the grace period counts from the warning, like on the server', () => {
  const warned = { ...walk, warnedAt: new Date('2026-10-06T22:25:40Z') }

  expect(graceEndsAt(warned)).toEqual(new Date('2026-10-06T22:30:40Z'))
})

test('before the warning arrives, the grace period counts from the deadline', () => {
  expect(graceEndsAt(walk)).toEqual(new Date('2026-10-06T22:30:00Z'))
})

test('a warning from before an extension does not count', () => {
  const extended = {
    ...walk,
    deadline: new Date('2026-10-06T22:35:00Z'),
    warnedAt: new Date('2026-10-06T22:25:40Z'),
  }

  expect(graceEndsAt(extended)).toEqual(new Date('2026-10-06T22:40:00Z'))
})

test('names read like a sentence', () => {
  expect(namesInWords([])).toBe('')
  expect(namesInWords(['Mum'])).toBe('Mum')
  expect(namesInWords(['Mum', 'Alex'])).toBe('Mum and Alex')
  expect(namesInWords(['Mum', 'Alex', 'Sam'])).toBe('Mum, Alex and Sam')
})
