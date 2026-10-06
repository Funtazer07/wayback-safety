/** Whole minutes from now until the deadline, rounded up. Never below 0. */
export function minutesUntil(deadline: Date, now: Date): number {
  const milliseconds = deadline.getTime() - now.getTime()
  return Math.max(0, Math.ceil(milliseconds / 60_000))
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

/** The time of day as on a 24-hour clock, for example "23:40". */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}
