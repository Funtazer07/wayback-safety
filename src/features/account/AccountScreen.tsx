import { logOut } from '../auth/auth.ts'

type AccountScreenProps = {
  displayName: string
}

/**
 * The Account tab of screen 09. For now only who is signed in and Log out, which moved here from
 * Home. Deleting the account and the privacy statement come later (docs/backend.md, "Not built yet").
 */
function AccountScreen({ displayName }: AccountScreenProps) {
  return (
    <main className="screen">
      <h1>Account</h1>
      <p>
        Signed in as <strong>{displayName}</strong>.
      </p>
      <div className="screen-actions">
        <button type="button" onClick={() => logOut()}>
          Log out
        </button>
      </div>
    </main>
  )
}

export default AccountScreen
