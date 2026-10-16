// A stand-alone test, outside the app: pick a destination and compare walking routes by the
// street lights along them. The lamps themselves are not drawn on the map. Users only add a mark
// where a street light is broken, and a broken light no longer counts for the routes.

// MapLibre writes coordinates as [longitude, latitude]: the other way round from Leaflet.
const eindhovenCentre = [5.4697, 51.4416]
const eindhovenBounds = [
  [5.35, 51.35],
  [5.6, 51.53],
]

// The municipality's open data portal, dataset "data-openbare-verlichting": the source named in
// SCRUM-26. (The municipality's map server, used before, was down with an outage page.)
const lampExportUrl =
  'https://data.eindhoven.nl/api/explore/v2.1/catalog/datasets/data-openbare-verlichting/exports/geojson'
// Free public route planners on OpenStreetMap data, run by FOSSGIS. Fine for a test; a real
// app needs its own or a paid one.
const footRouter = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/'
const bikeRouter = 'https://routing.openstreetmap.de/routed-bike/route/v1/bike/'

// Assumption: a lamp lights the route when it stands within 5 m of it. A wider reach also
// counted lamps on a busy road running next to the walking route. Tested with 3 m too: then
// most lamps on normal streets drop out, because a route often follows the middle of the road.
const lampReach = 5
// Assumption: a tap within 30 m of a street light is meant for that light. The user cannot see
// the lamps, so the tap has to be forgiving.
const reportReach = 30
// Assumption: an average walking pace of 5 km/h, to give the cycle-network route a walking time.
const walkingMetresPerSecond = 5000 / 3600
const maxRoutes = 3

// Prototype only: reports are kept on this device. Sharing them with everyone needs the database
// and is worked out in a later sprint. Defined up here because the saved reports are read while
// the page starts.
const reportsKey = 'wayback.prototype.brokenLights'

const routeColour = '#2563eb'
const locationColour = '#16a34a'
const brokenColour = '#dc2626'

const osmAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const mapStyles = {
  // The same raster tiles the app uses now, so it looks like the current map.
  street: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: osmAttribution,
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  },
  // Vector tiles from OpenFreeMap (free, no key): sharp at every zoom level.
  detailed: 'https://tiles.openfreemap.org/styles/liberty',
  night: 'https://tiles.openfreemap.org/styles/dark',
}

// ---- State -------------------------------------------------------------------------------

let lastPosition = null
let watchId = null
let chosenStart = null
let destination = null
let routes = []
let selectedIndex = 0
let planRequest
// True while the list of routes is open. Choosing a route closes it, to give the map more room.
let isChoosingRoute = false
// The street light found under a long press, waiting for the user to confirm it is broken.
let pressedLamp = null
let reports = loadReports()

const hintElement = document.getElementById('hint')
const statusElement = document.getElementById('status')
const routesElement = document.getElementById('routes')
const routeListElement = document.getElementById('route-list')
const summaryElement = document.getElementById('route-summary')
const summaryTextElement = document.getElementById('route-summary-text')
const reportSheet = document.getElementById('report-sheet')
const reportLampElement = document.getElementById('report-lamp')
const brokenLightButton = document.getElementById('report-broken-light')

function setStatus(text) {
  statusElement.textContent = text
}

function startPoint() {
  if (chosenStart) return chosenStart
  if (lastPosition && isInEindhoven(lastPosition.coordinates)) return lastPosition.coordinates
  return null
}

function updateHint() {
  if (routes.length > 0 && isChoosingRoute) {
    hintElement.textContent = 'Pick the route you want to walk.'
  } else if (routes.length > 0) {
    hintElement.textContent = 'Press and hold the map to report a broken street light.'
  } else if (!startPoint()) {
    hintElement.textContent = 'Tap the map where you start, or use My location.'
  } else {
    hintElement.textContent =
      'Tap where you want to go. Press and hold to report a broken street light.'
  }
}

function isInEindhoven([lon, lat]) {
  const [[west, south], [east, north]] = eindhovenBounds
  return lon >= west && lon <= east && lat >= south && lat <= north
}

const map = new maplibregl.Map({
  container: 'map',
  style: mapStyles.detailed,
  center: eindhovenCentre,
  zoom: 15,
  minZoom: 12,
  maxZoom: 19,
  maxBounds: eindhovenBounds,
  attributionControl: { compact: true },
})

// ---- Measuring along a route ---------------------------------------------------------------

// Turns longitude and latitude into metres around one point. Accurate enough inside a city.
function metresAround([lon0, lat0]) {
  const metresPerLon = 111320 * Math.cos((lat0 * Math.PI) / 180)
  const metresPerLat = 110540
  return ([lon, lat]) => [(lon - lon0) * metresPerLon, (lat - lat0) * metresPerLat]
}

// How far a point is from the route, and how far along the route its nearest spot lies.
function measureFromRoute(routeInMetres, point) {
  let nearest = { distance: Infinity, along: 0 }
  let walked = 0
  for (let index = 0; index < routeInMetres.length - 1; index++) {
    const [ax, ay] = routeInMetres[index]
    const [bx, by] = routeInMetres[index + 1]
    const [px, py] = point
    const dx = bx - ax
    const dy = by - ay
    const length = Math.hypot(dx, dy)
    const share =
      length === 0
        ? 0
        : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / (length * length)))
    const distance = Math.hypot(px - (ax + share * dx), py - (ay + share * dy))
    if (distance < nearest.distance) nearest = { distance, along: walked + share * length }
    walked += length
  }
  return nearest
}

function routeLength(routeInMetres) {
  let length = 0
  for (let index = 0; index < routeInMetres.length - 1; index++) {
    const [ax, ay] = routeInMetres[index]
    const [bx, by] = routeInMetres[index + 1]
    length += Math.hypot(bx - ax, by - ay)
  }
  return length
}

// Two routes are the same when nearly every point of one lies on the other.
function isSameRoute(first, second) {
  const toMetres = metresAround(first.coordinates[0])
  const firstInMetres = first.coordinates.map(toMetres)
  const samples = second.coordinates.filter((_, index) => index % 4 === 0)
  const onFirst = samples.filter(
    (point) => measureFromRoute(firstInMetres, toMetres(point)).distance < 15,
  )
  return onFirst.length / samples.length > 0.9
}

// The register sometimes lists two lamps at exactly the same spot. Lamps are compared by spot.
function placeOf(coordinates) {
  return coordinates.map((value) => value.toFixed(6)).join(',')
}

// ---- Asking the route planner and the lamp register ---------------------------------------

// An outside service sometimes does not answer for half a minute and then works again. So a
// request gives up after a while and is tried once more, instead of waiting forever.
const requestTimeout = 12_000

async function fetchOnce(url, options) {
  const timeout = AbortSignal.timeout(requestTimeout)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  const response = await fetch(url, { ...options, signal })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.json()
}

async function fetchJson(url, options = {}) {
  try {
    return await fetchOnce(url, options)
  } catch (error) {
    // Stopped on purpose (a new plan or Start over): do not try again.
    if (options.signal?.aborted) throw error
    return fetchOnce(url, options)
  }
}

async function fetchRoutes(from, to, signal) {
  const path = `${from.join(',')};${to.join(',')}?alternatives=3&overview=full&geometries=geojson`
  const [walking, cycling] = await Promise.allSettled([
    fetchJson(footRouter + path, { signal }),
    fetchJson(bikeRouter + path, { signal }),
  ])

  const candidates = []
  if (walking.status === 'fulfilled' && walking.value.code === 'Ok') {
    for (const route of walking.value.routes) {
      candidates.push({
        coordinates: route.geometry.coordinates,
        duration: route.duration,
      })
    }
  }
  // The cycle network often follows bigger, better lit roads: a useful extra choice.
  if (cycling.status === 'fulfilled' && cycling.value.code === 'Ok') {
    const route = cycling.value.routes[0]
    candidates.push({
      coordinates: route.geometry.coordinates,
      duration: route.distance / walkingMetresPerSecond,
    })
  }

  const unique = []
  for (const candidate of candidates) {
    if (!unique.some((route) => isSameRoute(route, candidate))) unique.push(candidate)
  }
  return unique.slice(0, maxRoutes)
}

// The portal can only search inside rectangles. One rectangle around a whole route would also
// hold many lamps far away from it, so the route is cut into pieces of about this length, each
// with its own rectangle. The exact distance check comes after.
const pieceLength = 250

function rectanglesAlong(coordinates, routeInMetres) {
  const margin = lampReach + 5
  const marginLat = margin / 110540
  const marginLon = margin / (111320 * Math.cos((coordinates[0][1] * Math.PI) / 180))
  const rectangles = []
  let piece = [coordinates[0]]
  let walked = 0

  for (let index = 1; index < coordinates.length; index++) {
    piece.push(coordinates[index])
    const [ax, ay] = routeInMetres[index - 1]
    const [bx, by] = routeInMetres[index]
    walked += Math.hypot(bx - ax, by - ay)

    if (walked >= pieceLength || index === coordinates.length - 1) {
      const lons = piece.map(([lon]) => lon)
      const lats = piece.map(([, lat]) => lat)
      rectangles.push({
        south: Math.min(...lats) - marginLat,
        west: Math.min(...lons) - marginLon,
        north: Math.max(...lats) + marginLat,
        east: Math.max(...lons) + marginLon,
      })
      piece = [coordinates[index]]
      walked = 0
    }
  }
  return rectangles
}

function rectangleAround([lon, lat], metres) {
  const marginLat = metres / 110540
  const marginLon = metres / (111320 * Math.cos((lat * Math.PI) / 180))
  return {
    south: lat - marginLat,
    west: lon - marginLon,
    north: lat + marginLat,
    east: lon + marginLon,
  }
}

function inRectangle({ south, west, north, east }) {
  const values = [south, west, north, east].map((value) => value.toFixed(6))
  return `in_bbox(geo_point_2d, ${values.join(', ')})`
}

async function lampsAlong(route, signal) {
  const toMetres = metresAround(route.coordinates[0])
  const routeInMetres = route.coordinates.map(toMetres)

  const params = new URLSearchParams({
    where: rectanglesAlong(route.coordinates, routeInMetres).map(inRectangle).join(' OR '),
    select: 'geo_point_2d',
  })
  const answer = await fetchJson(`${lampExportUrl}?${params}`, { signal })

  const brokenPlaces = new Set(reports.map((report) => placeOf(report.coordinates)))
  const working = new Map()
  const broken = new Set()

  for (const feature of answer.features ?? []) {
    const coordinates = feature.geometry?.coordinates
    if (!Array.isArray(coordinates)) continue
    const place = placeOf(coordinates)
    if (working.has(place) || broken.has(place)) continue

    // The rectangles are rough: only lamps really within reach of the route count.
    const { distance, along } = measureFromRoute(routeInMetres, toMetres(coordinates))
    if (distance > lampReach) continue

    // A light reported as broken gives no light, so it does not count for the route.
    if (brokenPlaces.has(place)) broken.add(place)
    else working.set(place, along)
  }

  const length = routeLength(routeInMetres)
  const lampCount = working.size

  // The longest piece of the route without a working lamp, from the start, between lamps, to the
  // end.
  const spots = [0, ...[...working.values()].sort((first, second) => first - second), length]
  let longestDark = 0
  for (let index = 1; index < spots.length; index++) {
    longestDark = Math.max(longestDark, spots[index] - spots[index - 1])
  }

  return {
    ...route,
    lampCount,
    brokenCount: broken.size,
    length,
    lampsPerKm: lampCount / (length / 1000),
    longestDark,
  }
}

// The street light nearest to a tap, or null when there is none close enough.
async function lampNear(point) {
  const params = new URLSearchParams({
    where: inRectangle(rectangleAround(point, reportReach)),
    select: 'objectid,straatnaam,identificatie,geo_point_2d',
  })
  const answer = await fetchJson(`${lampExportUrl}?${params}`)
  const toMetres = metresAround(point)

  let nearest = null
  for (const feature of answer.features ?? []) {
    const coordinates = feature.geometry?.coordinates
    if (!Array.isArray(coordinates)) continue
    const [x, y] = toMetres(coordinates)
    const distance = Math.hypot(x, y)
    if (distance > reportReach || (nearest && distance >= nearest.distance)) continue
    nearest = {
      distance,
      coordinates,
      lampId: String(feature.properties?.objectid ?? ''),
      street: feature.properties?.straatnaam ?? '',
      number: feature.properties?.identificatie ?? '',
    }
  }
  return nearest
}

// ---- Planning ------------------------------------------------------------------------------

// After a report the walk is planned again: then the map stays where the user was looking, the
// chosen route stays chosen, and a thank-you shows when the counting is done.
async function plan({ thankYou = '', keepView = false } = {}) {
  planRequest?.abort()
  planRequest = new AbortController()
  const { signal } = planRequest
  const chosenRoute = keepView ? routes[selectedIndex] : null

  if (!keepView) {
    routes = []
    isChoosingRoute = false
    showRoutes()
  }
  setStatus('Finding walking routes…')

  try {
    const found = await fetchRoutes(startPoint(), destination, signal)
    if (found.length === 0) {
      setStatus('Could not find a walking route to this place. Try a spot on a street.')
      return
    }
    setStatus('Counting the street lights along each route…')
    routes = await Promise.all(found.map((route) => lampsAlong(route, signal)))
    // The route with the most street lights comes first and is shown, the others follow.
    const recommended = routes[mostLampsIndex()]
    routes = [recommended, ...routes.filter((route) => route !== recommended)]
    selectedIndex = chosenRoute
      ? Math.max(
          0,
          routes.findIndex((route) => isSameRoute(chosenRoute, route)),
        )
      : 0
    // A new walk opens the list to choose from; planning again after a report keeps it as it was.
    if (!keepView) isChoosingRoute = true
    setStatus(thankYou)
    showRoutes()
    if (!keepView) fitToRoutes()
  } catch {
    if (signal.aborted) return
    setStatus('Could not plan a route. Check your connection and try again.')
  }
}

function fastestIndex() {
  return routes.reduce(
    (best, route, index) => (route.duration < routes[best].duration ? index : best),
    0,
  )
}

function mostLampsIndex() {
  return routes.reduce((best, route, index) => {
    const bestRoute = routes[best]
    if (route.lampsPerKm > bestRoute.lampsPerKm) return index
    if (route.lampsPerKm === bestRoute.lampsPerKm && route.longestDark < bestRoute.longestDark)
      return index
    return best
  }, 0)
}

function fitToRoutes() {
  const bounds = new maplibregl.LngLatBounds()
  for (const route of routes) for (const point of route.coordinates) bounds.extend(point)
  map.fitBounds(bounds, {
    padding: {
      // Extra room on top: the destination pin sticks out above the spot it marks.
      top: document.getElementById('panel').offsetHeight + 72,
      bottom: routesElement.offsetHeight + 32,
      left: 40,
      right: 40,
    },
    maxZoom: 17,
  })
}

// ---- Showing the routes ---------------------------------------------------------------------

function formatMinutes(seconds) {
  return `${Math.max(1, Math.round(seconds / 60))} min`
}

function formatDistance(metres) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`
}

function textElement(tag, className, text) {
  const element = document.createElement(tag)
  element.className = className
  element.textContent = text
  return element
}

function routeCard(route, index) {
  const card = document.createElement('button')
  card.type = 'button'
  card.className = 'route-card'
  card.setAttribute('aria-pressed', String(index === selectedIndex))
  card.addEventListener('click', () => selectRoute(index))

  const badges = document.createElement('div')
  badges.className = 'badges'
  if (index === mostLampsIndex()) badges.append(textElement('span', 'badge', 'Most street lights'))
  if (index === fastestIndex()) badges.append(textElement('span', 'badge', 'Fastest'))

  const top = document.createElement('div')
  top.className = 'route-top'
  top.append(
    textElement('span', 'route-time', formatMinutes(route.duration)),
    textElement('span', 'route-distance', formatDistance(route.length)),
  )

  card.append(
    ...(badges.childElementCount > 0 ? [badges] : []),
    top,
    textElement(
      'span',
      'route-lamps',
      `${route.lampCount} lights, ${Math.round(route.lampsPerKm)} per km`,
    ),
    textElement(
      'span',
      'route-gap',
      `Longest gap between lights: ${formatDistance(route.longestDark)}`,
    ),
  )
  if (route.brokenCount > 0) {
    const text =
      route.brokenCount === 1
        ? '1 light on this route is reported broken'
        : `${route.brokenCount} lights on this route are reported broken`
    card.append(textElement('span', 'route-broken', text))
  }
  // Colour is never the only sign of the chosen route.
  if (index === selectedIndex) card.append(textElement('span', 'route-shown', 'On the map'))
  return card
}

// The chosen route in one line, shown at the bottom once the list of routes is closed.
function routeSummary(route) {
  const badges = document.createElement('div')
  badges.className = 'badges'
  if (route === routes[mostLampsIndex()])
    badges.append(textElement('span', 'badge', 'Most street lights'))
  if (route === routes[fastestIndex()]) badges.append(textElement('span', 'badge', 'Fastest'))

  const details = [
    formatDistance(route.length),
    `${route.lampCount} lights`,
    ...(route.brokenCount > 0 ? [`${route.brokenCount} broken`] : []),
  ].join(' · ')

  return [
    ...(badges.childElementCount > 0 ? [badges] : []),
    textElement('span', 'summary-time', formatMinutes(route.duration)),
    textElement('span', 'summary-details', details),
  ]
}

function showRoutes() {
  const hasRoutes = routes.length > 0
  routesElement.hidden = !hasRoutes || !isChoosingRoute
  summaryElement.hidden = !hasRoutes || isChoosingRoute
  routeListElement.replaceChildren(...routes.map(routeCard))
  summaryTextElement.replaceChildren(...(hasRoutes ? routeSummary(routes[selectedIndex]) : []))
  updateHint()
  updateMapData()
}

// Choosing a route closes the list, so most of the screen is map for the walk.
function selectRoute(index) {
  selectedIndex = index
  isChoosingRoute = false
  showRoutes()
}

document.getElementById('other-routes').addEventListener('click', () => {
  isChoosingRoute = true
  showRoutes()
})

function updateMapData() {
  map.getSource('routes')?.setData({
    type: 'FeatureCollection',
    features: routes.map((route, index) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: route.coordinates },
      properties: { index, isSelected: index === selectedIndex },
    })),
  })
  map.getSource('reports')?.setData({
    type: 'FeatureCollection',
    features: reports.map((report) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: report.coordinates },
      properties: { lampId: report.lampId, street: report.street, reportedAt: report.reportedAt },
    })),
  })
  map.getSource('me')?.setData(locationCollection())
}

// ---- Reports of broken lights --------------------------------------------------------------

function loadReports() {
  try {
    const saved = JSON.parse(localStorage.getItem(reportsKey) ?? '[]')
    return Array.isArray(saved) ? saved.filter((report) => Array.isArray(report?.coordinates)) : []
  } catch {
    return []
  }
}

function saveReports() {
  try {
    localStorage.setItem(reportsKey, JSON.stringify(reports))
  } catch {
    // Storage is blocked (private mode): the reports stay until the page is closed.
  }
}

const foundLampMarker = new maplibregl.Marker({ element: foundLampElement() })

function foundLampElement() {
  const element = document.createElement('div')
  element.className = 'found-lamp'
  element.setAttribute('aria-label', 'The street light you are reporting')
  return element
}

function describeLamp(lamp) {
  if (!lamp.street) return 'The nearest street light'
  return lamp.number ? `${lamp.street}, number ${lamp.number}` : lamp.street
}

// Counts the lookups, so the answer to an older long press never fills in a newer menu.
let lookupCount = 0

// Opens after a long press: the choices of what to report at that spot. The nearest street light
// is looked up straight away, so the user only has to tap once.
async function openReportMenu(point) {
  const lookup = ++lookupCount
  pressedLamp = null
  foundLampMarker.remove()
  brokenLightButton.disabled = true
  reportLampElement.textContent = 'Looking for the nearest street light…'
  reportSheet.hidden = false

  try {
    const lamp = await lampNear(point)
    if (lookup !== lookupCount || reportSheet.hidden) return
    if (!lamp) {
      reportLampElement.textContent =
        'No street light found near this spot. Press and hold closer to the light.'
      return
    }
    if (reports.some((report) => placeOf(report.coordinates) === placeOf(lamp.coordinates))) {
      reportLampElement.textContent = `${describeLamp(lamp)} is already reported as broken.`
      return
    }
    pressedLamp = lamp
    foundLampMarker.setLngLat(lamp.coordinates).addTo(map)
    reportLampElement.textContent = describeLamp(lamp)
    brokenLightButton.disabled = false
    brokenLightButton.focus()
  } catch {
    if (lookup !== lookupCount) return
    reportLampElement.textContent =
      'Could not look up the street lights. Check your connection and try again.'
  }
}

function closeReportSheet() {
  lookupCount++
  reportSheet.hidden = true
  pressedLamp = null
  foundLampMarker.remove()
}

function afterReportsChanged(thankYou) {
  saveReports()
  updateMapData()
  // The counts change when a light breaks or is fixed, so plan the walk again.
  if (destination && startPoint()) plan({ thankYou, keepView: true })
  else setStatus(thankYou)
}

brokenLightButton.addEventListener('click', () => {
  if (!pressedLamp) return
  reports = [
    ...reports,
    {
      lampId: pressedLamp.lampId,
      coordinates: pressedLamp.coordinates,
      street: pressedLamp.street,
      reportedAt: new Date().toISOString(),
    },
  ]
  closeReportSheet()
  afterReportsChanged('Thank you. The light is marked as broken.')
})

document.getElementById('report-cancel').addEventListener('click', () => closeReportSheet())

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !reportSheet.hidden) closeReportSheet()
})

// ---- Press and hold --------------------------------------------------------------------------

// Assumption: holding a finger still for about half a second means "press and hold", like in
// other map apps. Phones do not give one signal for this (an iPhone sends none at all), so it is
// measured here. Moving the finger, or a second finger for zooming, cancels it.
const holdTime = 550
const holdMaxMove = 10
let holdTimer = null
let holdStart = null
// A long press ends with the finger lifting, which the map may also see as a tap. That tap is
// ignored, so it does not plan a walk or close the menu that just opened.
let ignoreTapsUntil = 0

function cancelHold() {
  clearTimeout(holdTimer)
  holdTimer = null
  holdStart = null
}

function onHold(lngLat) {
  ignoreTapsUntil = Date.now() + 700
  // A short buzz on phones that can, so the user feels the press was noticed.
  navigator.vibrate?.(15)
  openReportMenu([lngLat.lng, lngLat.lat])
}

map.on('touchstart', (event) => {
  cancelHold()
  if (event.originalEvent.touches.length !== 1) return
  holdStart = event.point
  const { lngLat } = event
  holdTimer = setTimeout(() => {
    holdTimer = null
    onHold(lngLat)
  }, holdTime)
})
map.on('touchmove', (event) => {
  if (holdStart && event.point.dist(holdStart) > holdMaxMove) cancelHold()
})
map.on('touchend', cancelHold)
map.on('touchcancel', cancelHold)

// A right click on a laptop. Android also sends this after a long press: the time check stops
// the menu from opening twice.
map.on('contextmenu', (event) => {
  event.originalEvent.preventDefault()
  if (Date.now() < ignoreTapsUntil) return
  onHold(event.lngLat)
})

function removeReport(lampId) {
  reports = reports.filter((report) => report.lampId !== lampId)
  afterReportsChanged('Thank you. The light counts as working again.')
}

// ---- Start and destination markers ---------------------------------------------------------

function pinElement() {
  const element = document.createElement('div')
  element.innerHTML = `
    <svg class="destination-pin" viewBox="0 0 36 44" aria-hidden="true">
      <path d="M18 2C9.7 2 3 8.5 3 16.6 3 27.5 18 42 18 42s15-14.5 15-25.4C33 8.5 26.3 2 18 2z"
        fill="#dc2626" stroke="#fff" stroke-width="2.5"/>
      <circle cx="18" cy="16.5" r="5.5" fill="#fff"/>
    </svg>`
  element.setAttribute('aria-label', 'Destination')
  return element
}

function startElement() {
  const element = document.createElement('div')
  element.className = 'start-dot'
  element.setAttribute('aria-label', 'Start')
  return element
}

const destinationMarker = new maplibregl.Marker({ element: pinElement(), anchor: 'bottom' })
const startMarker = new maplibregl.Marker({ element: startElement() })

// ---- Tapping the map -----------------------------------------------------------------------

const tappableLayers = ['route-hit', 'reports']

map.on('click', (event) => {
  if (Date.now() < ignoreTapsUntil) return
  // With the report menu open, a tap on the map closes it instead of planning a walk.
  if (!reportSheet.hidden) {
    closeReportSheet()
    return
  }
  const point = [event.lngLat.lng, event.lngLat.lat]

  // A tap on a route or a report is handled by that layer, not as a new place. A tap on the
  // chosen route does nothing, so a slip of the finger does not plan a new walk.
  const layers = [...tappableLayers, 'route-selected'].filter((id) => map.getLayer(id))
  if (map.queryRenderedFeatures(event.point, { layers }).length > 0) return

  if (!startPoint()) {
    chosenStart = point
    startMarker.setLngLat(point).addTo(map)
    updateHint()
    return
  }
  destination = point
  destinationMarker.setLngLat(point).addTo(map)
  plan()
})

map.on('click', 'route-hit', (event) => {
  if (Date.now() < ignoreTapsUntil || !reportSheet.hidden) return
  selectRoute(event.features[0].properties.index)
})

map.on('click', 'reports', (event) => {
  if (Date.now() < ignoreTapsUntil || !reportSheet.hidden) return
  const report = event.features[0]
  const { lampId, street, reportedAt } = report.properties

  const content = document.createElement('div')
  content.append(textElement('strong', '', 'Reported broken'))
  if (street) content.append(textElement('p', '', street))
  content.append(textElement('p', '', `Reported ${new Date(reportedAt).toLocaleString('en-GB')}`))
  const removeButton = textElement('button', 'popup-button', 'It works again')
  removeButton.type = 'button'
  content.append(removeButton)

  const popup = new maplibregl.Popup({ offset: 16 })
    .setLngLat(report.geometry.coordinates)
    .setDOMContent(content)
    .addTo(map)
  removeButton.addEventListener('click', () => {
    popup.remove()
    removeReport(lampId)
  })
})

for (const layer of tappableLayers) {
  map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
  map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
}

document.getElementById('clear').addEventListener('click', () => {
  planRequest?.abort()
  chosenStart = null
  destination = null
  routes = []
  isChoosingRoute = false
  startMarker.remove()
  destinationMarker.remove()
  closeReportSheet()
  setStatus('')
  showRoutes()
})

// ---- The user's position -------------------------------------------------------------------

// A circle on the ground as a polygon, so it keeps its real size in metres at every zoom.
function accuracyCircle([lon, lat], metres) {
  const points = []
  const latRadius = metres / 111320
  const lonRadius = metres / (111320 * Math.cos((lat * Math.PI) / 180))
  for (let step = 0; step <= 64; step++) {
    const angle = (step / 64) * 2 * Math.PI
    points.push([lon + lonRadius * Math.cos(angle), lat + latRadius * Math.sin(angle)])
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [points] } }
}

function locationCollection() {
  if (!lastPosition) return { type: 'FeatureCollection', features: [] }
  return {
    type: 'FeatureCollection',
    features: [
      accuracyCircle(lastPosition.coordinates, lastPosition.accuracy),
      { type: 'Feature', geometry: { type: 'Point', coordinates: lastPosition.coordinates } },
    ],
  }
}

function onPosition(position) {
  const isFirst = !lastPosition
  lastPosition = {
    coordinates: [position.coords.longitude, position.coords.latitude],
    accuracy: position.coords.accuracy,
  }
  map.getSource('me')?.setData(locationCollection())

  if (!isInEindhoven(lastPosition.coordinates)) {
    setStatus('You are outside Eindhoven. Tap the map where you start instead.')
    return
  }
  if (isFirst) {
    setStatus('')
    updateHint()
    if (!destination) map.flyTo({ center: lastPosition.coordinates, zoom: 16 })
  }
}

function onPositionError() {
  setStatus('Could not find your location. Allow location access, or tap where you start.')
}

// The position is only drawn and used to plan. It is never stored or sent anywhere, except
// as the start point to the route planner.
document.getElementById('locate').addEventListener('click', () => {
  if (lastPosition && isInEindhoven(lastPosition.coordinates)) {
    map.flyTo({ center: lastPosition.coordinates, zoom: 16 })
    return
  }
  if (!('geolocation' in navigator)) {
    onPositionError()
    return
  }
  setStatus('Finding your location…')
  if (watchId === null) {
    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
    })
  }
})

// ---- Icons ---------------------------------------------------------------------------------

// A broken light: a white bulb with a slash through it, in a red badge with a white edge. Drawn at
// twice the size and shown at half, so it stays sharp. Bulb shape from the Lucide icon set (ISC
// licence).
const brokenLightSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32">
    <circle cx="16" cy="16.75" r="13" fill="#000" opacity="0.22"/>
    <circle cx="16" cy="15" r="12" fill="${brokenColour}" stroke="#fff" stroke-width="2.25"/>
    <g transform="translate(6.4 5.4) scale(0.8)" fill="none" stroke="#fff" stroke-width="2.4"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
      <path d="M3 3l18 18"/>
    </g>
  </svg>`

function loadSvg(svg) {
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return image.decode().then(() => image)
}
const brokenLightIcon = loadSvg(brokenLightSvg)

// "You are here": a dot with a white edge and a slow pulse around it. Drawn on a canvas each
// frame. People who asked their phone for less motion get a still glow.
const isReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const dotSize = 112

function youAreHereIcon() {
  return {
    width: dotSize,
    height: dotSize,
    data: new Uint8Array(dotSize * dotSize * 4),
    onAdd() {
      const canvas = document.createElement('canvas')
      canvas.width = dotSize
      canvas.height = dotSize
      this.context = canvas.getContext('2d', { willReadFrequently: true })
    },
    render() {
      const context = this.context
      const middle = dotSize / 2
      const dotRadius = 13
      const pulse = isReducedMotion ? 0.55 : (performance.now() % 2000) / 2000

      context.clearRect(0, 0, dotSize, dotSize)

      context.beginPath()
      context.arc(middle, middle, dotRadius + (middle - dotRadius) * pulse, 0, Math.PI * 2)
      context.fillStyle = `rgba(22, 163, 74, ${0.35 * (1 - pulse)})`
      context.fill()

      context.beginPath()
      context.arc(middle, middle, dotRadius + 5, 0, Math.PI * 2)
      context.fillStyle = '#ffffff'
      context.shadowColor = 'rgba(0, 0, 0, 0.35)'
      context.shadowBlur = 8
      context.fill()
      context.shadowBlur = 0

      context.beginPath()
      context.arc(middle, middle, dotRadius, 0, Math.PI * 2)
      context.fillStyle = locationColour
      context.fill()

      this.data = context.getImageData(0, 0, dotSize, dotSize).data
      if (!isReducedMotion) map.triggerRepaint()
      return true
    },
  }
}

// ---- Our own layers, added again after every style change ---------------------------------

const emptyCollection = { type: 'FeatureCollection', features: [] }

// setStyle() replaces everything on the map, images included, so our layers go on top again.
map.on('style.load', async () => {
  map.addImage('broken-light', await brokenLightIcon, { pixelRatio: 2 })
  map.addImage('you-are-here', youAreHereIcon(), { pixelRatio: 2 })

  map.addSource('routes', { type: 'geojson', data: emptyCollection })
  map.addLayer({
    id: 'route-others',
    type: 'line',
    source: 'routes',
    filter: ['!', ['get', 'isSelected']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#64748b',
      'line-width': 5,
      'line-opacity': 0.75,
      'line-dasharray': [1, 1.6],
    },
  })
  map.addLayer({
    id: 'route-casing',
    type: 'line',
    source: 'routes',
    filter: ['get', 'isSelected'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 10 },
  })
  map.addLayer({
    id: 'route-selected',
    type: 'line',
    source: 'routes',
    filter: ['get', 'isSelected'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': routeColour, 'line-width': 6 },
  })
  // Invisible and wide, so a route is easy to tap with a finger.
  map.addLayer({
    id: 'route-hit',
    type: 'line',
    source: 'routes',
    filter: ['!', ['get', 'isSelected']],
    paint: { 'line-color': '#000000', 'line-width': 24, 'line-opacity': 0 },
  })

  // Only the lights someone reported as broken are drawn, not the whole register.
  map.addSource('reports', { type: 'geojson', data: emptyCollection })
  map.addLayer({
    id: 'reports',
    type: 'symbol',
    source: 'reports',
    layout: {
      'icon-image': 'broken-light',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.55, 17, 0.9],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })

  map.addSource('me', { type: 'geojson', data: emptyCollection })
  map.addLayer({
    id: 'me-accuracy',
    type: 'fill',
    source: 'me',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': locationColour, 'fill-opacity': 0.12 },
  })
  map.addLayer({
    id: 'me-accuracy-edge',
    type: 'line',
    source: 'me',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'line-color': locationColour, 'line-opacity': 0.5, 'line-width': 1 },
  })
  map.addLayer({
    id: 'me',
    type: 'symbol',
    source: 'me',
    filter: ['==', ['geometry-type'], 'Point'],
    layout: {
      'icon-image': 'you-are-here',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })

  updateMapData()
})

document.getElementById('style-picker').addEventListener('change', (event) => {
  // No diff: always load the new style fresh, so 'style.load' fires and our layers come back.
  map.setStyle(mapStyles[event.target.value], { diff: false })
})

updateHint()
