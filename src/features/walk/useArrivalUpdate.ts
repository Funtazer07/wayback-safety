import { useEffect, useState } from 'react'
import { fetchAlertStatus } from '../contacts/contacts.ts'
import { arrivalUpdate, type ArrivalUpdate } from './arrival.ts'
import { fetchWalkContacts } from './walk.ts'

/** Null while loading or after an error; the screen then leaves the card out. */
export function useArrivalUpdate(walkId: string): ArrivalUpdate | null {
  const [update, setUpdate] = useState<ArrivalUpdate | null>(null)

  useEffect(() => {
    let isCurrent = true
    Promise.all([
      fetchWalkContacts(walkId),
      // Without it, everyone who accepted counts as told.
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
