import { useEffect, useState } from 'react'
import {
  BrowserPushError,
  checkNotifications,
  disableNotifications,
  enableNotifications,
  type NotificationState,
} from './notifications.ts'

type NotificationsHookState = {
  notificationState: NotificationState | null
  isLoading: boolean
  error: string | null
}

const loading: NotificationsHookState = { notificationState: null, isLoading: true, error: null }

export function useNotifications() {
  const [state, setState] = useState(loading)

  useEffect(() => {
    let isCurrent = true
    checkNotifications()
      .then(
        (notificationState) =>
          isCurrent && setState({ notificationState, isLoading: false, error: null }),
      )
      // Showing the button lets the user try again.
      .catch(
        () => isCurrent && setState({ notificationState: 'off', isLoading: false, error: null }),
      )

    return () => {
      isCurrent = false
    }
  }, [])

  /** Call it from a button tap. */
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

  async function disable() {
    setState({ ...state, isLoading: true, error: null })
    try {
      await disableNotifications()
      setState({ notificationState: 'off', isLoading: false, error: null })
    } catch {
      setState({
        ...state,
        isLoading: false,
        error: 'Could not turn off notifications. Check your connection and try again.',
      })
    }
  }

  return { ...state, enable, disable }
}
