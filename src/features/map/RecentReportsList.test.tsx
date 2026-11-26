import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import RecentReportsList from './RecentReportsList.tsx'
import type { RecentReport } from './recentReports.ts'

const now = new Date('2026-11-18T22:00:00')

const report: RecentReport = {
  id: 'r-1',
  kind: 'place',
  category: 'unsafe',
  coordinates: [5.4797, 51.4433],
  reportedAt: new Date('2026-11-18T21:35:00'),
  nearUser: false,
  nearRoute: true,
}

test('the list stays closed until the user opens it, and the button shows how many there are', () => {
  render(<RecentReportsList reports={[report]} canSearch now={now} onSelect={vi.fn()} />)

  const toggle = screen.getByRole('button', { name: 'Recent reports (1)' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('region', { name: 'Recent reports' })).not.toBeInTheDocument()

  fireEvent.click(toggle)

  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('region', { name: 'Recent reports' })).toHaveTextContent('Last 3 hours')
})

test('a report shows its category, its age and whether it is near the route', () => {
  render(<RecentReportsList reports={[report]} canSearch now={now} onSelect={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Recent reports (1)' }))

  const item = screen.getByRole('button', { name: /Suspicious or unsafe situation/ })
  expect(item).toHaveTextContent('25 minutes ago · Near your route')
})

test('choosing a report hands it to the map', () => {
  const onSelect = vi.fn()
  render(<RecentReportsList reports={[report]} canSearch now={now} onSelect={onSelect} />)
  fireEvent.click(screen.getByRole('button', { name: 'Recent reports (1)' }))

  fireEvent.click(screen.getByRole('button', { name: /Suspicious or unsafe situation/ }))

  expect(onSelect).toHaveBeenCalledWith(report)
})

test('without a location or route the list asks for the location instead of saying all is quiet', () => {
  render(<RecentReportsList reports={[]} canSearch={false} now={now} onSelect={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Recent reports' }))

  expect(screen.getByText('Turn on your location to see reports near you.')).toBeInTheDocument()
})

test('with a location and no reports the list says there are none nearby', () => {
  render(<RecentReportsList reports={[]} canSearch now={now} onSelect={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Recent reports' }))

  expect(screen.getByText('No reports near you or your route.')).toBeInTheDocument()
})
