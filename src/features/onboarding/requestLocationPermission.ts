/**
 * Makes the phone show its "allow location?" question. Finishes whether the user allows or blocks
 * it. The position itself is thrown away: nothing is stored or sent.
 */
export function requestLocationPermission(): Promise<void> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve()
      return
    }

    navigator.geolocation.getCurrentPosition(
      () => resolve(),
      () => resolve(),
      { timeout: 10_000 },
    )
  })
}
