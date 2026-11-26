import { useState } from 'react'

function AccountLocation() {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function allowLocation() {
    if (!window.isSecureContext) {
      setMessage('Open WayBack using HTTPS to allow location on this phone.')
      return
    }
    if (!navigator.geolocation) {
      setMessage('Location is not supported by this browser.')
      return
    }
    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      () => {
        setIsLoading(false)
        setMessage('Location access is available. Use My location on the map.')
      },
      (error) => {
        setIsLoading(false)
        setMessage(
          error.code === 1
            ? 'Location is blocked. Allow it in your browser’s website settings, then try again.'
            : 'Could not find your location. Check that location services are on and try again.',
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  return (
    <section className="card account-location" aria-labelledby="account-location-title">
      <h2 id="account-location-title">Location</h2>
      <button type="button" onClick={allowLocation} disabled={isLoading}>
        {isLoading ? 'Finding your location…' : 'Allow my location'}
      </button>
      {message && <p role="status">{message}</p>}
      <details>
        <summary>How location is used</summary>
        <p>
          This button checks access without saving your location. During a walk, WayBack can share
          your last location with your chosen trusted contacts.
        </p>
      </details>
    </section>
  )
}

export default AccountLocation
