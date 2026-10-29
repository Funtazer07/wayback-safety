type HintState = {
  hasRoutes: boolean
  isChoosing: boolean
  hasStart: boolean
}

export function plannerHint({ hasRoutes, isChoosing, hasStart }: HintState): string {
  if (hasRoutes && isChoosing) return 'Pick the route you want to walk.'
  if (hasRoutes) return 'Press and hold the map to report a broken street light.'
  if (!hasStart) return 'Tap the map where you start, or use My location.'
  return 'Tap where you want to go. Press and hold to report a broken street light.'
}

type LocationState = {
  isLocating: boolean
  isUnavailable: boolean
  isOutside: boolean
}

export function locationMessage({ isLocating, isUnavailable, isOutside }: LocationState): string {
  if (isUnavailable)
    return 'Could not find your location. Allow location access, or tap where you start.'
  if (isOutside) return 'You are outside Eindhoven. Tap the map where you start instead.'
  if (isLocating) return 'Finding your location…'
  return ''
}
