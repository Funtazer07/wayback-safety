type CheckEmailProps = {
  email: string
  onBack: () => void
}

function CheckEmail({ email, onBack }: CheckEmailProps) {
  return (
    <main className="screen">
      <h1>Check your email</h1>
      <p>
        We sent an email to <strong>{email}</strong>. Tap the link in it to continue.
      </p>
      {/* On iPhone the link opens in Safari, not in the app on the home screen. See docs/backend.md. */}
      <p className="auth-note">
        Using the app from your home screen? The link opens in your browser instead. Go back and
        choose "Use a password instead" to log in here.
      </p>

      <div className="screen-actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </main>
  )
}

export default CheckEmail
