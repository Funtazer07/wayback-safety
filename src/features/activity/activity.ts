import type { ContactWalk } from '../followedWalk/followedWalk.ts'
import { formatClock } from '../walk/time.ts'

/** Which kind of update: decides the colour of the bell. The words always say it too. */
export type ActivityTone = 'overdue' | 'walking' | 'safe' | 'stopped'

/** One card of the Activity feed (screen 09). */
export type ActivityUpdate = {
  walkId: string
  tone: ActivityTone
  title: string
  lines: string[]
  /** When it happened, for the time on the card and the order of the feed. */
  at: Date
}

/**
 * What the feed says about the latest walk of someone the user looks out for. The design's texts,
 * with two changes on purpose: no destination ("Home · …"), because a contact is not told where
 * the walker is going (decided on 25 Oct), and no "her" or "his", because the app does not know
 * anyone's pronouns.
 */
export function activityUpdate(walk: ContactWalk): ActivityUpdate {
  const name = walk.walkerName
  const base = { walkId: walk.walkId }

  if (walk.status === 'overdue') {
    return {
      ...base,
      tone: 'overdue',
      title: `${name} hasn’t checked in`,
      lines: [
        `The check-in was due at ${formatClock(walk.deadline)}.`,
        'This doesn’t necessarily mean something is wrong.',
      ],
      at: walk.overdueAt ?? walk.deadline,
    }
  }
  if (walk.status === 'active') {
    return {
      ...base,
      tone: 'walking',
      title: `${name} started a walk`,
      lines: [`Check-in due at ${formatClock(walk.deadline)}.`],
      at: walk.startedAt,
    }
  }
  if (walk.status === 'safe') {
    return {
      ...base,
      tone: 'safe',
      title: `${name} arrived safely`,
      lines: ['The walk ended. Location sharing stopped.'],
      at: walk.checkedInAt ?? walk.deadline,
    }
  }
  return {
    ...base,
    tone: 'stopped',
    title: `${name} stopped the walk`,
    lines: ['No check-in will follow.'],
    at: walk.cancelledAt ?? walk.deadline,
  }
}

/** The feed, newest first, as in the design. */
export function activityFeed(walks: ContactWalk[]): ActivityUpdate[] {
  return walks.map(activityUpdate).sort((a, b) => b.at.getTime() - a.at.getTime())
}

/** "22:31" for today, "Yesterday", or "24 Oct" for older updates (an overdue walk can be old). */
export function activityTime(at: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000)
  if (days <= 0) return formatClock(at)
  if (days === 1) return 'Yesterday'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(at)
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}
