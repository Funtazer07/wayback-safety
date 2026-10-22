import { useEffect, useState } from 'react'
import {
  BrowserPushError,
  checkNotifications,
  enableNotifications,
  type NotificationState,
} from './notifications.ts'

type NotificationsHookState = {
  /** null while the phone is being checked. */
  notificationState: NotificationState | null
  isLoading: boolean
  error: string | null
}

const loading: NotificationsHookState = { notificationState: null, isLoading: true, error: null }

/** Whether this phone can get alerts, and a way to turn them on. */
export function useNotifications() {
  const [state, setState] = useState(loading)

  useEffect(() => {
    let isCurrent = true
    checkNotifications()
      .then(
        (notificationState) =>
          isCurrent && setState({ notificationState, isLoading: false, error: null }),
      )
      // Could not reach the server to save the subscription again. Showing the button lets the
      // user try once more.
      .catch(
        () => isCurrent && setState({ notificationState: 'off', isLoading: false, error: null }),
      )

    return () => {
      isCurrent = false
    }
  }, [])

  /** Asks the user for permission. Call it from a button tap. */
  async function enable() {
    setState({ ...state, isLoading: true, error: null })
    try {
      const notificationState = await enableNotifications()
      setState({ notificationState, isLoading: false, error: null })
    } catch (error) {
      setState({
        ...state,
        isLoading: false,
        error:
          error instanceof BrowserPushError
            ? 'Your browser could not turn on notifications. Try another browser, or check its privacy settings.'
            : 'Could not turn on notifications. Check your connection and try again.',
      })
    }
  }

  return { ...state, enable }
}
