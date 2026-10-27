import { useState } from 'react'
import { logOut } from '../auth/auth.ts'
import { disableNotifications } from '../notifications/notifications.ts'
import AccountNotifications from './AccountNotifications.tsx'

type AccountScreenProps = {
  displayName: string
  onLoggingOut: (alertsStopped: boolean) => void
}

function AccountScreen({ displayName, onLoggingOut }: AccountScreenProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogOut() {
    setIsLoggingOut(true)
    // Before logging out: after it, the server no longer lets this phone delete its subscription.
    const alertsStopped = await disableNotifications().then(
      () => true,
      () => false,
    )
    onLoggingOut(alertsStopped)
    // Offline, the session is still forgotten on this phone, so there is nothing to show.
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
