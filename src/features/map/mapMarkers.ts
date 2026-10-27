import maplibregl from 'maplibre-gl'

function markerElement(className: string, label: string, html = ''): HTMLElement {
  const element = document.createElement('div')
  element.className = className
  element.setAttribute('aria-label', label)
  element.innerHTML = html
  return element
}

/** Amber, so it does not look like a destination. */
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

export function startMarker(): maplibregl.Marker {
  return new maplibregl.Marker({ element: markerElement('map-start', 'Start') })
}

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

export function foundLampMarker(): maplibregl.Marker {
  return new maplibregl.Marker({
    element: markerElement('map-found-lamp', 'The street light you are reporting'),
  })
}
