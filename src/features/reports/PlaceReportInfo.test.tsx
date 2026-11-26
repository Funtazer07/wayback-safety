import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import PlaceReportInfo from './PlaceReportInfo.tsx'
import type { PlaceReport } from './reports.ts'

const report: PlaceReport = {
  id: 'r-1',
  category: 'dark_area',
  coordinates: [5.479, 51.439],
  reportedAt: new Date('2026-11-18T20:30:00'),
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-18T23:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

test('a report shows its category and how old it is, and nothing about who made it', () => {
  render(<PlaceReportInfo report={report} onClose={vi.fn()} />)

  const sheet = screen.getByRole('dialog', { name: 'Dark or unlit area' })
  expect(sheet).toHaveTextContent('Reported 2 hours ago.')
  expect(sheet).not.toHaveTextContent(/by |user|name/i)
})
