import { useEffect, useState } from 'react'
import {
  fetchNewContacts,
  loadSeenContactIds,
  saveSeenContactIds,
  type NewContact,
} from './newContacts.ts'

/** New contacts this phone has not shown yet, and a way to stop showing them. */
export function useNewContacts(userId: string) {
  const [contacts, setContacts] = useState<NewContact[]>([])

  useEffect(() => {
    let isCurrent = true
    fetchNewContacts(userId)
      .then((found) => {
        const seen = loadSeenContactIds()
        if (isCurrent) setContacts(found.filter((contact) => !seen.includes(contact.id)))
      })
      // Only a welcome: without it the app works the same.
      .catch(() => {})
    return () => {
      isCurrent = false
    }
  }, [userId])

  function dismiss() {
    saveSeenContactIds([...loadSeenContactIds(), ...contacts.map((contact) => contact.id)])
    setContacts([])
  }

  return { contacts, dismiss }
}
