type CheckEmailProps = {
  email: string
  onBack: () => void
}

function CheckEmail({ email, onBack }: CheckEmailProps) {
  return (
    <main className="auth">
      <h1>Check your email</h1>
      <p>
        We sent an email to <strong>{email}</strong>. Tap the link in it to continue.
      </p>
      {/* On iPhone the link opens in Safari, not in the app on the home screen. See docs/backend.md. */}
      <p className="auth-note">
        Using the app from your home screen? The link opens in your browser instead. Go back and
        choose "Use a password" to log in here.
      </p>

      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  )
}

export default CheckEmail
