import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ReactNode } from 'react'
import { PreviewClockContext, useNow } from './PreviewClock.ts'

afterEach(() => vi.useRealTimers())

test('the preview clock stops at the check-in time', () => {
  vi.useFakeTimers()
  const stoppedAt = new Date('2026-10-07T18:00:00Z')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PreviewClockContext value={stoppedAt}>{children}</PreviewClockContext>
  )
  const { result } = renderHook(useNow, { wrapper })
  act(() => vi.advanceTimersByTime(60_000))
  expect(result.current).toEqual(stoppedAt)
})

test('the preview clock keeps counting before check-in', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-07T18:00:00Z'))
  const { result } = renderHook(useNow)
  act(() => vi.advanceTimersByTime(2_000))
  expect(result.current).toEqual(new Date('2026-10-07T18:00:02Z'))
})
