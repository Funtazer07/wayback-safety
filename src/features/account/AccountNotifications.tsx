import { NotificationCardView } from '../notifications/NotificationCard.tsx'
import { useNotifications } from '../notifications/useNotifications.ts'

/**
 * Notifications on the Account tab (SCRUM-105). When they are on, a way to turn them off, for
 * example on a borrowed phone. When they are off, the usual card to turn them on. Both use the same
 * state, so allowing or turning off shows the other one at once.
 */
function AccountNotifications() {
  const notifications = useNotifications()
  const { notificationState, isLoading, error, disable } = notifications

  // Nothing to show while this phone is being checked.
  if (!notificationState) return null

  if (notificationState !== 'on') {
    return (
      <NotificationCardView
        reason="WayBack can then tell you about your walks and the walks of the people you look out for, also when your phone is locked."
        {...notifications}
      />
    )
  }

  return (
    <section className="card" aria-labelledby="account-notifications-title">
      <h2 id="account-notifications-title" className="notifications-title">
        Notifications
      </h2>
      <p>Notifications are on for this phone.</p>
      <button type="button" disabled={isLoading} onClick={disable}>
        Turn off notifications
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}

export default AccountNotifications
