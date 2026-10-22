import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import type { LngLat } from './geometry.ts'
import type { MeasuredRoute } from './lamps.ts'
import RoutePlanner from './RoutePlanner.tsx'

const services = vi.hoisted(() => ({
  fetchRoutes: vi.fn(),
  measureRouteLamps: vi.fn(),
  findLampNear: vi.fn(),
}))

// Stand-ins for the route planner and the lamp register, so the test never goes online.
vi.mock('./routes.ts', () => ({ fetchRoutes: services.fetchRoutes }))
vi.mock('./lamps.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lamps.ts')>()),
  measureRouteLamps: services.measureRouteLamps,
  findLampNear: services.findLampNear,
}))

// Stand-in for the MapLibre map, which needs a real browser. Its buttons play the taps and the
// long press a user would do on the map.
vi.mock('./MapView.tsx', () => ({
  default: (props: { onTap?: (point: LngLat) => void; onHold: (point: LngLat) => void }) => (
    <div>
      <button type="button" onClick={() => props.onTap?.([5.4791, 51.4385])}>
        Tap Stratumseind
      </button>
      <button type="button" onClick={() => props.onTap?.([5.4797, 51.4433])}>
        Tap the station
      </button>
      <button type="button" onClick={() => props.onHold([5.4784, 51.4412])}>
        Hold at Vestdijk
      </button>
    </div>
  ),
}))

// Two ways from Stratumseind to the station, side by side about 150 m apart.
function way(longitude: number): LngLat[] {
  return Array.from({ length: 12 }, (_, step) => [longitude, 51.4385 + step * 0.0004])
}
const viaCityCentre = { coordinates: way(5.4791), duration: 840 }
const quickWay = { coordinates: way(5.4813), duration: 660 }

function measured(route: typeof viaCityCentre, lampsPerKm: number, brokenCount = 0) {
  return {
    ...route,
    length: 1000,
    lampCount: lampsPerKm,
    brokenCount,
    lampsPerKm,
    longestDark: 90,
  } as MeasuredRoute
}

const onRouteChange = vi.fn()

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  services.fetchRoutes.mockResolvedValue([quickWay, viaCityCentre])
  // The quick way has fewer lights; a broken light takes one off the route through the centre.
  services.measureRouteLamps.mockImplementation(async (route, brokenPlaces: Set<string>) =>
    route === quickWay
      ? measured(quickWay, 27)
      : measured(viaCityCentre, 91 - brokenPlaces.size, brokenPlaces.size),
  )
  services.findLampNear.mockResolvedValue({
    lampId: '776',
    coordinates: [5.478385, 51.441212],
    street: 'Vestdijk',
    number: '002',
  })
})

test('a user picks a start and a destination and gets the routes, most street lights first', async () => {
  render(<RoutePlanner onRouteChange={onRouteChange} />)
  expect(screen.getByText('Tap the map where you start, or use My location.')).toBeInTheDocument()

  click('Tap Stratumseind')
  expect(screen.getByText(/Tap where you want to go/)).toBeInTheDocument()
  click('Tap the station')

  const list = await screen.findByRole('region', { name: 'Choose a route' })
  const [first, second] = within(list).getAllByRole('button')
  expect(first).toHaveTextContent('Most street lights')
  expect(first).toHaveTextContent('91 lights')
  expect(second).toHaveTextContent('Fastest')
  expect(services.fetchRoutes).toHaveBeenCalledWith(
    [5.4791, 51.4385],
    [5.4797, 51.4433],
    expect.any(AbortSignal),
  )
})

test('choosing a route closes the list and keeps a short summary', async () => {
  render(<RoutePlanner onRouteChange={onRouteChange} />)
  click('Tap Stratumseind')
  click('Tap the station')

  fireEvent.click(await screen.findByRole('button', { name: /Fastest/ }))

  expect(screen.queryByRole('region', { name: 'Choose a route' })).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Your route' })).toHaveTextContent('Fastest')

  click('Other routes')
  expect(screen.getByRole('region', { name: 'Choose a route' })).toBeInTheDocument()
})

test('a long press reports the nearest street light, and the routes are counted again', async () => {
  render(<RoutePlanner onRouteChange={onRouteChange} />)
  click('Tap Stratumseind')
  click('Tap the station')
  fireEvent.click(await screen.findByRole('button', { name: /Fastest/ }))

  click('Hold at Vestdijk')
  const menu = screen.getByRole('dialog', { name: 'Report a problem here' })
  const report = await within(menu).findByRole('button', { name: /Vestdijk, number 002/ })
  fireEvent.click(report)

  expect(await screen.findByText('Thank you. The light is marked as broken.')).toBeInTheDocument()
  // The user's choice stays: still the fastest route, with the list closed.
  expect(screen.getByRole('region', { name: 'Your route' })).toHaveTextContent('Fastest')
  click('Other routes')
  expect(screen.getByRole('region', { name: 'Choose a route' })).toHaveTextContent(
    '90 lights, 90 per km',
  )
  expect(JSON.parse(localStorage.getItem('wayback.brokenLights') ?? '[]')).toHaveLength(1)
})

test('a light that is already reported cannot be reported twice', async () => {
  render(<RoutePlanner onRouteChange={onRouteChange} />)
  click('Hold at Vestdijk')
  fireEvent.click(await screen.findByRole('button', { name: /Vestdijk, number 002/ }))

  click('Hold at Vestdijk')

  expect(await screen.findByText(/is already reported as broken/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Broken street light/ })).toBeDisabled()
})

test('a long press far from any street light says so', async () => {
  services.findLampNear.mockResolvedValue(null)
  render(<RoutePlanner onRouteChange={onRouteChange} />)

  click('Hold at Vestdijk')

  expect(await screen.findByText(/No street light found near this spot/)).toBeInTheDocument()
  click('Cancel')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('tells which route is on the map, so the walk can show it', async () => {
  render(<RoutePlanner onRouteChange={onRouteChange} />)
  expect(onRouteChange).toHaveBeenLastCalledWith(null)

  click('Tap Stratumseind')
  click('Tap the station')
  await screen.findByRole('region', { name: 'Choose a route' })
  expect(onRouteChange).toHaveBeenLastCalledWith(viaCityCentre.coordinates)

  fireEvent.click(screen.getByRole('button', { name: /Fastest/ }))
  expect(onRouteChange).toHaveBeenLastCalledWith(quickWay.coordinates)

  click('Start over')
  expect(onRouteChange).toHaveBeenLastCalledWith(null)
})
