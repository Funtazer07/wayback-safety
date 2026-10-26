import { useState } from 'react'
import { logOut } from '../auth/auth.ts'
import { disableNotifications } from '../notifications/notifications.ts'
import AccountNotifications from './AccountNotifications.tsx'

type AccountScreenProps = {
  displayName: string
  /** Called just before logging out, with whether alerts on this phone could be stopped. */
  onLoggingOut: (alertsStopped: boolean) => void
}

/**
 * The Account tab of screen 09: who is signed in, notifications and Log out. Deleting the account
 * and the privacy statement come in SCRUM-108 and SCRUM-110.
 */
function AccountScreen({ displayName, onLoggingOut }: AccountScreenProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogOut() {
    setIsLoggingOut(true)
    // First stop the alerts, while still signed in: after logging out the server no longer lets
    // this phone delete its subscription. A shared or borrowed phone would keep getting the alerts
    // of the person who logged out.
    const alertsStopped = await disableNotifications().then(
      () => true,
      () => false,
    )
    onLoggingOut(alertsStopped)
    // Offline, Supabase still forgets the session on this phone and only reports that the server
    // did not hear it. The user is logged out either way, so there is nothing to show.
    await logOut().catch(() => {})
    setIsLoggingOut(false)
  }

  return (
    <main className="screen">
      <h1>Account</h1>
      <p>
        Signed in as <strong>{displayName}</strong>.
      </p>
      <AccountNotifications />
      <div className="screen-actions">
        <button type="button" disabled={isLoggingOut} onClick={handleLogOut}>
          Log out
        </button>
      </div>
    </main>
  )
}

export default AccountScreen
