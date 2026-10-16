import type { Map as MapLibreMap, MapMouseEvent, MapTouchEvent } from 'maplibre-gl'
import type { LngLat } from './geometry.ts'

// Assumption: holding a finger still for about half a second means "press and hold", like in
// other map apps. Phones do not give one signal for this (an iPhone sends none at all), so it is
// measured here. Moving the finger, or a second finger for zooming, cancels it.
const holdTime = 550
const holdMaxMove = 10

/**
 * Calls `onHold` when the user presses and holds the map, or right-clicks it on a laptop. A long
 * press ends with the finger lifting, which the map may also see as a tap: `isTapIgnored` tells
 * the tap handler to skip that tap.
 */
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
    // A short buzz on phones that can, so the user feels the press was noticed.
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

  // A right click on a laptop. Android also sends this after a long press: the time check stops
  // the menu from opening twice.
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
