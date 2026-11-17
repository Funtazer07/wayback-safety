
import type { MeasuredRoute } from './lamps.ts'

export function compareRoute(
  route: MeasuredRoute,
  fastestRoute: MeasuredRoute,
) {
  // is this the route we're comparing everything against?
  const isBaseline = route === fastestRoute

  // how many extra seconds does this route take?
  const extraSeconds = Math.max(
    0,
    route.duration - fastestRoute.duration,
  )

  // convert seconds into minutes.
  const extraMinutes = Math.ceil(extraSeconds / 60)

  // Find the difference in streetlights per kilometre.
  const lightingDifference =
    route.lampsPerKm - fastestRoute.lampsPerKm

  // calculate the percentage difference.
  // we cannot divide by zero.
  const lightingPercent =
    fastestRoute.lampsPerKm > 0
      ? Math.round(
          (lightingDifference / fastestRoute.lampsPerKm) * 100,
        )
      : null

  // make the result easy to read.
  let lightingText = 'Same number of lights/km'

  if (isBaseline) {
    lightingText = 'Baseline'
  } else if (lightingPercent === null) {
    lightingText =
      route.lampsPerKm > 0
        ? 'More lights (percentage unavailable)'
        : 'Both have 0 lights/km'
  } else if (lightingPercent > 0) {
    lightingText = `+${lightingPercent}% lights/km`
  } else if (lightingPercent < 0) {
    lightingText = `${lightingPercent}% lights/km`
  }

  const timeText = isBaseline
    ? 'Baseline'
    : extraSeconds === 0
      ? 'Same walking time'
      : `+${extraMinutes} min`

  return {
    isBaseline,
    lightingPercent,
    lightingText,
    timeText,
    lightsPerKm: Math.round(route.lampsPerKm),
    extraMinutes,
  }
}
