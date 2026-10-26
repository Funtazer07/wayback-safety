import { expect, test } from 'vitest'
import { arrivalUpdate } from './arrival.ts'
import type { WalkContact } from './walk.ts'

const mum: WalkContact = { id: 'c-mum', label: 'Mum', status: 'accepted' }
const alex: WalkContact = { id: 'c-alex', label: 'Alex', status: 'accepted' }
const pat: WalkContact = { id: 'c-pat', label: 'Pat', status: 'paused' }

test('contacts who can receive alerts are told, those with notifications off are not', () => {
  const update = arrivalUpdate(
    [mum, alex],
    new Map([
      ['c-mum', true],
      ['c-alex', false],
    ]),
  )

  expect(update).toEqual({ told: ['Mum'], notReached: ['Alex'] })
})

test('a paused contact got no message, so is not listed at all', () => {
  expect(arrivalUpdate([mum, pat], new Map())).toEqual({ told: ['Mum'], notReached: [] })
})

test('without the alert status, everyone who accepted counts as told', () => {
  expect(arrivalUpdate([mum, alex], new Map())).toEqual({ told: ['Mum', 'Alex'], notReached: [] })
})
