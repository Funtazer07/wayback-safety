import { NotificationCardView } from '../notifications/NotificationCard.tsx'
import { useNotifications } from '../notifications/useNotifications.ts'

function AccountNotifications() {
  const notifications = useNotifications()
  const { notificationState, isLoading, error, disable } = notifications

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
