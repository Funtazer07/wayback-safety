/** A spot on the map. MapLibre and GeoJSON write longitude first, then latitude. */
export type LngLat = [longitude: number, latitude: number]

export type Rectangle = {
  south: number
  west: number
  north: number
  east: number
}

export const eindhovenCentre: LngLat = [5.4697, 51.4416]
export const eindhovenBounds: [LngLat, LngLat] = [
  [5.35, 51.35],
  [5.6, 51.53],
]

const metresPerDegreeLatitude = 110540

function metresPerDegreeLongitude(latitude: number): number {
  return 111320 * Math.cos((latitude * Math.PI) / 180)
}

export function isInEindhoven([longitude, latitude]: LngLat): boolean {
  const [[west, south], [east, north]] = eindhovenBounds
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north
}

/**
 * Turns longitude and latitude into metres from one point. Accurate enough inside a city, and much
 * simpler than real map projections.
 */
export function metresFrom([longitude0, latitude0]: LngLat): (point: LngLat) => [number, number] {
  const perLongitude = metresPerDegreeLongitude(latitude0)
  return ([longitude, latitude]) => [
    (longitude - longitude0) * perLongitude,
    (latitude - latitude0) * metresPerDegreeLatitude,
  ]
}

export function distanceInMetres(from: LngLat, to: LngLat): number {
  const [x, y] = metresFrom(from)(to)
  return Math.hypot(x, y)
}

/** How far a point is from a line, and how far along the line its nearest spot lies (in metres). */
export function measureFromLine(
  lineInMetres: [number, number][],
  [px, py]: [number, number],
): { distance: number; along: number } {
  let nearest = { distance: Infinity, along: 0 }
  let walked = 0
  for (let index = 0; index < lineInMetres.length - 1; index++) {
    const [ax, ay] = lineInMetres[index]
    const [bx, by] = lineInMetres[index + 1]
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

export function lineLength(lineInMetres: [number, number][]): number {
  let length = 0
  for (let index = 0; index < lineInMetres.length - 1; index++) {
    const [ax, ay] = lineInMetres[index]
    const [bx, by] = lineInMetres[index + 1]
    length += Math.hypot(bx - ax, by - ay)
  }
  return length
}

/** Two lines are the same way when nearly every point of the second lies on the first. */
export function isSameWay(first: LngLat[], second: LngLat[]): boolean {
  // A "line" of one point has no length to lie on: then only the very same spot counts.
  if (first.length < 2) {
    return second.length > 0 && second.every((point) => placeOf(point) === placeOf(first[0]))
  }
  const toMetres = metresFrom(first[0])
  const firstInMetres = first.map(toMetres)
  const samples = second.filter((_, index) => index % 4 === 0)
  const onFirst = samples.filter(
    (point) => measureFromLine(firstInMetres, toMetres(point)).distance < 15,
  )
  return onFirst.length / samples.length > 0.9
}

export function rectangleAround([longitude, latitude]: LngLat, metres: number): Rectangle {
  const marginLatitude = metres / metresPerDegreeLatitude
  const marginLongitude = metres / metresPerDegreeLongitude(latitude)
  return {
    south: latitude - marginLatitude,
    west: longitude - marginLongitude,
    north: latitude + marginLatitude,
    east: longitude + marginLongitude,
  }
}

/**
 * Rectangles that together cover a line with a margin. One rectangle around a whole route would
 * also hold a lot of the city far away from it, so the line is cut into pieces of about
 * `pieceLength` metres, each with its own rectangle.
 */
export function rectanglesAlong(line: LngLat[], margin: number, pieceLength = 250): Rectangle[] {
  const marginLatitude = margin / metresPerDegreeLatitude
  const marginLongitude = margin / metresPerDegreeLongitude(line[0][1])
  const rectangles: Rectangle[] = []
  let piece: LngLat[] = [line[0]]
  let walked = 0

  for (let index = 1; index < line.length; index++) {
    piece.push(line[index])
    walked += distanceInMetres(line[index - 1], line[index])

    if (walked >= pieceLength || index === line.length - 1) {
      const longitudes = piece.map(([longitude]) => longitude)
      const latitudes = piece.map(([, latitude]) => latitude)
      rectangles.push({
        south: Math.min(...latitudes) - marginLatitude,
        west: Math.min(...longitudes) - marginLongitude,
        north: Math.max(...latitudes) + marginLatitude,
        east: Math.max(...longitudes) + marginLongitude,
      })
      piece = [line[index]]
      walked = 0
    }
  }
  return rectangles
}

/** The register sometimes lists two lamps at exactly the same spot. Lamps are compared by spot. */
export function placeOf([longitude, latitude]: LngLat): string {
  return `${longitude.toFixed(6)},${latitude.toFixed(6)}`
}
