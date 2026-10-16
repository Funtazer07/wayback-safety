export function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`
}

/** Distances in m below 1 km, else in km with one decimal. */
export function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`
}
