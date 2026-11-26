import { useEffect, useState } from 'react'

type Access = PermissionState | 'unknown'

/** The phone's answer for location, kept up to date. 'unknown' where the browser cannot tell. */
function useLocationAccess() {
  const [access, setAccess] = useState<Access>('unknown')

  useEffect(() => {
    let status: PermissionStatus | null = null
    let isCurrent = true
    const update = () => {
      if (status) setAccess(status.state)
    }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((answer) => {
        if (!isCurrent) return
        status = answer
        update()
        answer.addEventListener('change', update)
      })
      // Older browsers: the button below still works.
      .catch(() => {})
    return () => {
      isCurrent = false
      status?.removeEventListener('change', update)
    }
  }, [])

  return [access, setAccess] as const
}

function AccountLocation() {
  const [access, setAccess] = useLocationAccess()
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
        setAccess('granted')
        setMessage('')
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
      {access === 'granted' ? (
        <p role="status">Location is on for WayBack.</p>
      ) : (
        <button type="button" onClick={allowLocation} disabled={isLoading}>
          {isLoading ? 'Finding your location…' : 'Allow my location'}
        </button>
      )}
      {access === 'denied' && !message && (
        <p>Location is blocked. Allow it in your phone’s settings for this website or app.</p>
      )}
      {message && <p role="status">{message}</p>}
      <details>
        <summary>How location is used</summary>
        <p>
          The map uses it to show where you are, without saving it. During a walk, WayBack can share
          your last location with your chosen trusted contacts.
        </p>
      </details>
    </section>
  )
}

export default AccountLocation
