import { useEffect, useState } from 'react'
import { fetchAlertStatus } from '../contacts/contacts.ts'
import { arrivalUpdate, type ArrivalUpdate } from './arrival.ts'
import { fetchWalkContacts } from './walk.ts'

/**
 * Who heard that the user got home (SCRUM-106). Null while loading, or when the contacts could
 * not be loaded; the screen then leaves the contacts card out instead of guessing.
 */
export function useArrivalUpdate(walkId: string): ArrivalUpdate | null {
  const [update, setUpdate] = useState<ArrivalUpdate | null>(null)

  useEffect(() => {
    let isCurrent = true
    Promise.all([
      fetchWalkContacts(walkId),
      // Extra information: without it everyone who accepted counts as told.
      fetchAlertStatus().catch(() => new Map<string, boolean>()),
    ])
      .then(
        ([contacts, alertStatus]) => isCurrent && setUpdate(arrivalUpdate(contacts, alertStatus)),
      )
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [walkId])

  return update
}
