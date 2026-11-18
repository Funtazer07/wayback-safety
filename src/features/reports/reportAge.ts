const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** How old a report is: "just now", "5 minutes ago", "2 hours ago", "yesterday", "3 days ago". */
export function reportAge(reportedAt: Date, now = new Date()): string {
  const age = Math.max(0, now.getTime() - reportedAt.getTime())
  if (age < MINUTE) return 'just now'
  if (age < HOUR) return relative.format(-Math.floor(age / MINUTE), 'minute')
  if (age < DAY) return relative.format(-Math.floor(age / HOUR), 'hour')
  return relative.format(-Math.floor(age / DAY), 'day')
}
