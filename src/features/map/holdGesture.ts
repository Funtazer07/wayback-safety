import type { Map as MapLibreMap, MapMouseEvent, MapTouchEvent } from 'maplibre-gl'
import type { LngLat } from './geometry.ts'

// Phones give no single long-press signal (an iPhone sends none), so it is measured here.
const holdTime = 550
const holdMaxMove = 10

/** Lifting the finger after a hold also looks like a tap: `isTapIgnored` says to skip it. */
export function watchHold(map: MapLibreMap, onHold: (point: LngLat) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let startPoint: { x: number; y: number } | null = null
  let ignoreTapsUntil = 0

  function cancel() {
    clearTimeout(timer)
    timer = undefined
    startPoint = null
  }

  function hold({ lng, lat }: { lng: number; lat: number }) {
    ignoreTapsUntil = Date.now() + 700
    navigator.vibrate?.(15)
    onHold([lng, lat])
  }

  function onTouchStart(event: MapTouchEvent) {
    cancel()
    if (event.originalEvent.touches.length !== 1) return
    startPoint = event.point
    const { lngLat } = event
    timer = setTimeout(() => {
      timer = undefined
      hold(lngLat)
    }, holdTime)
  }

  function onTouchMove(event: MapTouchEvent) {
    if (!startPoint) return
    const moved = Math.hypot(event.point.x - startPoint.x, event.point.y - startPoint.y)
    if (moved > holdMaxMove) cancel()
  }

  // Android also sends this after a long press; the time check stops a double open.
  function onContextMenu(event: MapMouseEvent) {
    event.originalEvent.preventDefault()
    if (Date.now() < ignoreTapsUntil) return
    hold(event.lngLat)
  }

  map.on('touchstart', onTouchStart)
  map.on('touchmove', onTouchMove)
  map.on('touchend', cancel)
  map.on('touchcancel', cancel)
  map.on('contextmenu', onContextMenu)

  return {
    isTapIgnored: () => Date.now() < ignoreTapsUntil,
    stop() {
      cancel()
      map.off('touchstart', onTouchStart)
      map.off('touchmove', onTouchMove)
      map.off('touchend', cancel)
      map.off('touchcancel', cancel)
      map.off('contextmenu', onContextMenu)
    },
  }
}
