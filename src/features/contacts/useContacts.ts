import { useEffect, useState } from 'react'
import {
  createInvite,
  fetchContacts,
  removeContact,
  setContactPaused,
  type Contact,
  type Invite,
} from './contacts.ts'

type ContactsState = {
  contacts: Contact[]
  isLoading: boolean
  error: string | null
}

const loading: ContactsState = { contacts: [], isLoading: true, error: null }

/**
 * The user's trusted contacts and open invites (SCRUM-60), and what they can do with them. The
 * actions throw when the server refuses; the screen turns that into a sentence.
 */
export function useContacts(userId: string) {
  const [state, setState] = useState(loading)

  async function reload() {
    const contacts = await fetchContacts(userId)
    setState({ contacts, isLoading: false, error: null })
  }

  useEffect(() => {
    let isCurrent = true
    fetchContacts(userId)
      .then((contacts) => isCurrent && setState({ contacts, isLoading: false, error: null }))
      .catch(
        () =>
          isCurrent &&
          setState({ contacts: [], isLoading: false, error: 'Could not load your contacts.' }),
      )
    return () => {
      isCurrent = false
    }
  }, [userId])

  /** Makes an invite link for a new contact, and adds them to the list as pending. */
  async function invite(label: string): Promise<Invite> {
    const newInvite = await createInvite(label)
    await reload()
    return newInvite
  }

  async function pause(contactId: string, isPaused: boolean) {
    const updated = await setContactPaused(contactId, isPaused)
    setState((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => (contact.id === contactId ? updated : contact)),
    }))
  }

  async function remove(contactId: string) {
    await removeContact(contactId)
    setState((current) => ({
      ...current,
      contacts: current.contacts.filter((contact) => contact.id !== contactId),
    }))
  }

  return { ...state, invite, pause, remove }
}
