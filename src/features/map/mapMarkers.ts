import maplibregl from 'maplibre-gl'

function markerElement(className: string, label: string, html = ''): HTMLElement {
  const element = document.createElement('div')
  element.className = className
  element.setAttribute('aria-label', label)
  element.innerHTML = html
  return element
}

/**
 * Where a walker was last seen (SCRUM-102): an amber pin, so it does not look like a destination.
 * The label says it is the last known place, not where they are now.
 */
export function lastLocationMarker(): maplibregl.Marker {
  const pin = `
    <svg viewBox="0 0 36 44" aria-hidden="true">
      <path d="M18 2C9.7 2 3 8.5 3 16.6 3 27.5 18 42 18 42s15-14.5 15-25.4C33 8.5 26.3 2 18 2z"
        fill="#b45309" stroke="#fff" stroke-width="2.5"/>
      <circle cx="18" cy="16.5" r="5.5" fill="#fff"/>
    </svg>`
  return new maplibregl.Marker({
    element: markerElement('map-destination', 'Last known location, not live', pin),
    anchor: 'bottom',
  })
}

/** The start the user tapped: a white dot with a dark edge. */
export function startMarker(): maplibregl.Marker {
  return new maplibregl.Marker({ element: markerElement('map-start', 'Start') })
}

/** The destination: a red pin whose point marks the spot. */
export function destinationMarker(): maplibregl.Marker {
  const pin = `
    <svg viewBox="0 0 36 44" aria-hidden="true">
      <path d="M18 2C9.7 2 3 8.5 3 16.6 3 27.5 18 42 18 42s15-14.5 15-25.4C33 8.5 26.3 2 18 2z"
        fill="#dc2626" stroke="#fff" stroke-width="2.5"/>
      <circle cx="18" cy="16.5" r="5.5" fill="#fff"/>
    </svg>`
  return new maplibregl.Marker({
    element: markerElement('map-destination', 'Destination', pin),
    anchor: 'bottom',
  })
}

/** A red ring around the street light the user is about to report, to check it is the right one. */
export function foundLampMarker(): maplibregl.Marker {
  return new maplibregl.Marker({
    element: markerElement('map-found-lamp', 'The street light you are reporting'),
  })
}
