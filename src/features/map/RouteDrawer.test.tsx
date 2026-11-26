import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import RouteDrawer from './RouteDrawer.tsx'

test('swiping down hides route details and swiping up restores them', () => {
  render(
    <RouteDrawer>
      <button type="button">Other routes</button>
    </RouteDrawer>,
  )
  const panel = screen.getByRole('region', { name: 'Route panel' })
  fireEvent.touchStart(panel, { touches: [{ clientY: 100 }] })
  fireEvent.touchEnd(panel, { changedTouches: [{ clientY: 180 }] })
  expect(screen.queryByRole('button', { name: 'Other routes' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Show route' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  fireEvent.touchStart(panel, { touches: [{ clientY: 180 }] })
  fireEvent.touchEnd(panel, { changedTouches: [{ clientY: 100 }] })
  expect(screen.getByRole('button', { name: 'Other routes' })).toBeVisible()
})

test('route details can also be collapsed and opened with a button', () => {
  render(
    <RouteDrawer>
      <p>Route details</p>
    </RouteDrawer>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Hide route details' }))
  expect(screen.getByText('Route details')).not.toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Show route' }))
  expect(screen.getByText('Route details')).toBeVisible()
})
