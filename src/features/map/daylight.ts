import { eindhovenCentre, type LngLat } from './geometry.ts'
import type { MeasuredRoute } from './lamps.ts'

const toRadians = Math.PI / 180
// Noon on 1 January 2000 (UTC), the starting point of the usual sun formulas.
const j2000 = Date.UTC(2000, 0, 1, 12)
// The top of the sun just touches the horizon. Assumption: the lamps switch on at 15 or 20 lux,
// which is about this moment.
const sunsetElevation = -0.833

/** How high the sun stands above the horizon, in degrees. Accurate to well under a degree. */
export function sunElevation(date: Date, [longitude, latitude]: LngLat): number {
  const days = (date.getTime() - j2000) / 86_400_000
  const meanLongitude = 280.46 + 0.9856474 * days
  const meanAnomaly = (357.528 + 0.9856003 * days) * toRadians
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * toRadians
  const obliquity = (23.439 - 0.0000004 * days) * toRadians
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  )
  const siderealTime = (280.46061837 + 360.98564736629 * days + longitude) * toRadians
  const hourAngle = siderealTime - rightAscension
  const sine =
    Math.sin(latitude * toRadians) * Math.sin(declination) +
    Math.cos(latitude * toRadians) * Math.cos(declination) * Math.cos(hourAngle)
  return Math.asin(sine) / toRadians
}

/** Between sunset and sunrise in Eindhoven. */
export function isAfterDusk(date: Date): boolean {
  return sunElevation(date, eindhovenCentre) < sunsetElevation
}

/** Dark stretches only matter when the lamps are needed; the score itself stays the same. */
export function withDarkStretchesAfterDusk(
  routes: MeasuredRoute[],
  afterDusk: boolean,
): MeasuredRoute[] {
  return afterDusk ? routes : routes.map((route) => ({ ...route, darkStretches: [] }))
}
