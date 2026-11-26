import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import RouteDrawer from './RouteDrawer.tsx'

function swipe(element: Element, fromY: number, toY: number) {
  fireEvent.touchStart(element, { touches: [{ clientY: fromY }] })
  fireEvent.touchMove(element, { touches: [{ clientY: toY }] })
  fireEvent.touchEnd(element, { changedTouches: [{ clientY: toY }] })
}

test('swiping the handle down hides route details and swiping it up restores them', () => {
  render(
    <RouteDrawer>
      <button type="button">Other routes</button>
    </RouteDrawer>,
  )
  swipe(screen.getByRole('button', { name: 'Hide route details' }), 100, 180)
  expect(screen.queryByRole('button', { name: 'Other routes' })).not.toBeInTheDocument()
  const handle = screen.getByRole('button', { name: 'Show route' })
  expect(handle).toHaveAttribute('aria-expanded', 'false')

  swipe(handle, 180, 100)
  expect(screen.getByRole('button', { name: 'Other routes' })).toBeInTheDocument()
})

test('scrolling the route list with a downward swipe keeps the panel open', () => {
  render(
    <RouteDrawer>
      <button type="button">Other routes</button>
    </RouteDrawer>,
  )
  swipe(screen.getByRole('button', { name: 'Other routes' }), 100, 250)
  expect(screen.getByRole('button', { name: 'Hide route details' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
})

test('a short slip of the thumb on the handle does not close the panel', () => {
  render(
    <RouteDrawer>
      <button type="button">Other routes</button>
    </RouteDrawer>,
  )
  swipe(screen.getByRole('button', { name: 'Hide route details' }), 100, 140)
  expect(screen.getByRole('button', { name: 'Other routes' })).toBeInTheDocument()
})

test('route details can also be collapsed and opened with a button', () => {
  render(
    <RouteDrawer>
      <button type="button">Other routes</button>
    </RouteDrawer>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Hide route details' }))
  expect(screen.queryByRole('button', { name: 'Other routes' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show route' }))
  expect(screen.getByRole('button', { name: 'Other routes' })).toBeInTheDocument()
})
