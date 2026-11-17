import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { MeasuredRoute } from './lamps.ts'
import RouteList from './RouteList.tsx'

function route(duration: number, darkStretchCount: number): MeasuredRoute {
  return {
    coordinates: [],
    duration,
    length: 1200,
    lampCount: 30,
    brokenCount: 0,
    lampsPerKm: 25,
    longestDark: 80,
    darkStretches: Array.from({ length: darkStretchCount }, () => ({
      length: 80,
      coordinates: [],
    })),
  }
}

test('each route card says how many dark stretches it has', () => {
  render(
    <RouteList
      routes={[route(840, 2), route(660, 1), route(900, 0)]}
      selectedIndex={0}
      onSelect={() => {}}
    />,
  )
  const [first, second, third] = screen.getAllByRole('button')

  expect(first).toHaveTextContent('2 dark stretches')
  expect(second).toHaveTextContent('1 dark stretch')
  expect(third).not.toHaveTextContent('dark stretch')
})
