import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useWalkWatchers } from './useWalkWatchers.ts'

const { fetchWalkWatchers } = vi.hoisted(() => ({ fetchWalkWatchers: vi.fn() }))

vi.mock('../../lib/supabase.ts', () => ({ supabase: null }))
vi.mock('./walk.ts', () => ({ fetchWalkWatchers }))

beforeEach(() => {
  vi.useFakeTimers()
  fetchWalkWatchers.mockReset().mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

test('the walker sees "I’m watching" within seconds, without reloading the app', async () => {
  const { result } = renderHook(() => useWalkWatchers('walk-1'))
  await act(async () => {})
  expect(result.current).toEqual([])

  fetchWalkWatchers.mockResolvedValue(['Mum'])
  await act(async () => vi.advanceTimersByTime(5_000))

  expect(result.current).toEqual(['Mum'])
})

test('nothing is asked once the walk has ended', async () => {
  renderHook(() => useWalkWatchers(null))
  await act(async () => vi.advanceTimersByTime(60_000))

  expect(fetchWalkWatchers).not.toHaveBeenCalled()
})
