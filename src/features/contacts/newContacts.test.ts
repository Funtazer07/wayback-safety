import { beforeEach, expect, test, vi } from 'vitest'
import {
  fetchNewContacts,
  joinNames,
  loadSeenContactIds,
  saveSeenContactIds,
} from './newContacts.ts'

const { query } = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    order: vi.fn(),
  }
  return { query }
})

vi.mock('../../lib/supabase.ts', () => ({ supabase: { from: () => query } }))

beforeEach(() => {
  query.select.mockReset().mockReturnValue(query)
  query.eq.mockReset().mockReturnValue(query)
  query.gt.mockReset().mockReturnValue(query)
  query.order.mockReset()
  localStorage.clear()
})

test('new contacts are the user’s own accepted contacts from the last 2 days', async () => {
  query.order.mockResolvedValue({
    data: [{ id: 'contact-anna', label: 'Anna', accepted_at: '2026-10-27T20:10:00Z' }],
    error: null,
  })

  const found = await fetchNewContacts('user-1', new Date('2026-10-28T08:00:00Z'))

  expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
  expect(query.eq).toHaveBeenCalledWith('status', 'accepted')
  expect(query.gt).toHaveBeenCalledWith('accepted_at', '2026-10-26T08:00:00.000Z')
  expect(found).toEqual([
    { id: 'contact-anna', label: 'Anna', acceptedAt: new Date('2026-10-27T20:10:00Z') },
  ])
})

test('names are joined the way a sentence says them', () => {
  expect(joinNames(['Anna'])).toBe('Anna')
  expect(joinNames(['Anna', 'Sam'])).toBe('Anna and Sam')
  expect(joinNames(['Anna', 'Sam', 'Pat'])).toBe('Anna, Sam and Pat')
})

test('closed cards are remembered, and broken storage counts as nothing seen', () => {
  saveSeenContactIds(['contact-anna'])
  expect(loadSeenContactIds()).toEqual(['contact-anna'])

  localStorage.setItem('wayback.seenNewContacts', 'not json')
  expect(loadSeenContactIds()).toEqual([])
})
