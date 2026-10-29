import type { Map as MapLibreMap, StyleImageInterface } from 'maplibre-gl'

export const brokenColour = '#dc2626'
export const locationColour = '#16a34a'

// Drawn at twice the size, so it stays sharp. Bulb shape from Lucide (ISC licence).
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

let brokenLightImage: Promise<HTMLImageElement> | undefined

export function loadBrokenLightIcon(): Promise<HTMLImageElement> {
  brokenLightImage ??= (async () => {
    const image = new Image()
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(brokenLightSvg)}`
    await image.decode()
    return image
  })()
  return brokenLightImage
}

/** Pulses, except for people who asked their phone for less motion. */
export function youAreHereIcon(map: MapLibreMap): StyleImageInterface {
  const size = 112
  const isReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })

  const icon: StyleImageInterface = {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    render() {
      if (!context) return false
      const middle = size / 2
      const dotRadius = 13
      const pulse = isReducedMotion ? 0.55 : (performance.now() % 2000) / 2000

      context.clearRect(0, 0, size, size)
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

      icon.data = context.getImageData(0, 0, size, size).data
      if (!isReducedMotion) map.triggerRepaint()
      return true
    },
  }
  return icon
}
