import type { NotificationState } from './notifications.ts'
import { useNotifications } from './useNotifications.ts'
import './notifications.css'

type NotificationCardProps = {
  /** What notifications do for this person, as one sentence. Different for a user and a contact. */
  reason: string
}

// What the card says when the app cannot ask (yet). 'off' shows the button instead; 'on' hides the
// card.
const explanations: Partial<Record<NotificationState, string>> = {
  'needs-install': 'On iPhone, notifications only work after you add WayBack to your Home Screen.',
  blocked: 'Notifications are blocked for WayBack. You can allow them in your phone’s settings.',
  unsupported: 'This browser cannot show notifications from WayBack.',
  'not-set-up': 'Notifications are not available in this version of the app yet.',
  // Only developers see this one.
  'dev-server': 'Notifications only work in a build: run npm run build, then npm run preview.',
}

/**
 * Asks for notification permission with one tap. Used on the start-walk screen, the Contacts tab
 * and the screen where a contact accepts an invite.
 */
function NotificationCard({ reason }: NotificationCardProps) {
  return <NotificationCardView reason={reason} {...useNotifications()} />
}

type NotificationCardViewProps = NotificationCardProps & ReturnType<typeof useNotifications>

/**
 * The card itself, for a screen that already has useNotifications (the Account tab). Sharing one
 * state means the screen sees at once that notifications were turned on, without a reload.
 */
export function NotificationCardView({
  reason,
  notificationState,
  isLoading,
  error,
  enable,
}: NotificationCardViewProps) {
  // Nothing to show while checking, and nothing to do once notifications are on.
  if (!notificationState || notificationState === 'on') return null

  const explanation = explanations[notificationState]

  return (
    <section className="card" aria-labelledby="notification-card-title">
      <h2 id="notification-card-title" className="notifications-title">
        Turn on notifications
      </h2>
      <p>{reason}</p>
      {explanation ? (
        <p>{explanation}</p>
      ) : (
        <button type="button" disabled={isLoading} onClick={enable}>
          Allow notifications
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}

export default NotificationCard
