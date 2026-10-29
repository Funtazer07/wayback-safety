import type { NotificationState } from './notifications.ts'
import { useNotifications } from './useNotifications.ts'
import './notifications.css'

type NotificationCardProps = {
  reason: string
}

const explanations: Partial<Record<NotificationState, string>> = {
  'needs-install': 'On iPhone, notifications only work after you add WayBack to your Home Screen.',
  blocked: 'Notifications are blocked for WayBack. You can allow them in your phone’s settings.',
  unsupported: 'This browser cannot show notifications from WayBack.',
  'not-set-up': 'Notifications are not available in this version of the app yet.',
  'dev-server': 'Notifications only work in a build: run npm run build, then npm run preview.',
}

function NotificationCard({ reason }: NotificationCardProps) {
  return <NotificationCardView reason={reason} {...useNotifications()} />
}

type NotificationCardViewProps = NotificationCardProps & ReturnType<typeof useNotifications>

/** For a screen that already uses useNotifications, so both share one state. */
export function NotificationCardView({
  reason,
  notificationState,
  isLoading,
  error,
  enable,
}: NotificationCardViewProps) {
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
