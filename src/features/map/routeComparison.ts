
import type { MeasuredRoute } from './lamps.ts'

export function compareRoute(
  route: MeasuredRoute,
  fastestRoute: MeasuredRoute,
) {
  // check if this is the fastest route
  const isBaseline = route === fastestRoute

  // get the extra walking time compared to the fastest route
  const extraSeconds = Math.max(
    0,
    route.duration - fastestRoute.duration,
  )

  // convert the extra time to minutes
  const extraMinutes = Math.ceil(extraSeconds / 60)

  // calculate the difference in lights per km
  const lightingDifference =
    route.lampsPerKm - fastestRoute.lampsPerKm

  // round the number so it looks cleaner
  const lightDifference = Math.round(lightingDifference)

  // show if the route has more or fewer lights
  let lightingText = 'Same number of lights/km'

  if (isBaseline) {
    lightingText = 'Baseline'
  } else if (lightDifference > 0) {
    lightingText = `+${lightDifference} lights/km`
  } else if (lightDifference < 0) {
    lightingText = `${Math.abs(lightDifference)} fewer lights/km`
  }

  // show how many extra minutes the route takes
  const timeText = isBaseline
    ? 'Baseline'
    : extraSeconds === 0
      ? 'Same walking time'
      : `+${extraMinutes} min`

  return {
    isBaseline,
    lightDifference,
    lightingText,
    timeText,
    lightsPerKm: Math.round(route.lampsPerKm),
    extraMinutes,
  }
}
