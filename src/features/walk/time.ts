/** Whole minutes from now until the deadline, rounded up. Never below 0. */
export function minutesUntil(deadline: Date, now: Date): number {
  const milliseconds = deadline.getTime() - now.getTime()
  return Math.max(0, Math.ceil(milliseconds / 60_000))
}

/** Whole seconds from now until the deadline, rounded up. Never below 0. */
export function secondsUntil(deadline: Date, now: Date): number {
  const milliseconds = deadline.getTime() - now.getTime()
  return Math.max(0, Math.ceil(milliseconds / 1000))
}

/** A countdown as on a stopwatch: "12:05", or "1:02:05" from an hour up. */
export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const twoDigits = (value: number) => String(value).padStart(2, '0')

  return hours > 0
    ? `${hours}:${twoDigits(minutes)}:${twoDigits(seconds)}`
    : `${twoDigits(minutes)}:${twoDigits(seconds)}`
}

/** The part of the walk's time that is still left, from 1 at the start to 0 at the deadline. */
export function timeLeftShare(startedAt: Date, deadline: Date, now: Date): number {
  const total = deadline.getTime() - startedAt.getTime()
  if (total <= 0) return 0
  const left = (deadline.getTime() - now.getTime()) / total
  return Math.min(1, Math.max(0, left))
}

/** From this many minutes before the deadline the timer warns that time is almost up. */
const ALMOST_UP_MINUTES = 5

export type TimerPhase = 'on-time' | 'almost-up' | 'time-up'

export function timerPhase(deadline: Date, now: Date): TimerPhase {
  const seconds = secondsUntil(deadline, now)
  if (seconds === 0) return 'time-up'
  return seconds <= ALMOST_UP_MINUTES * 60 ? 'almost-up' : 'on-time'
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

/** The time of day as on a 24-hour clock, for example "23:40". */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}
