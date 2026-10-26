import { useEffect, useState } from 'react'
import {
  createInvite,
  fetchAlertStatus,
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
 * The contacts, each with whether they can receive alerts (SCRUM-103). That second question is
 * extra: when it fails, the list still shows, without the alert line.
 */
async function loadContacts(userId: string): Promise<Contact[]> {
  const [contacts, alertStatus] = await Promise.all([
    fetchContacts(userId),
    fetchAlertStatus().catch(() => new Map<string, boolean>()),
  ])
  return contacts.map((contact) => ({ ...contact, canReceiveAlerts: alertStatus.get(contact.id) }))
}

/**
 * The user's trusted contacts and open invites (SCRUM-60), and what they can do with them. The
 * actions throw when the server refuses; the screen turns that into a sentence.
 */
export function useContacts(userId: string) {
  const [state, setState] = useState(loading)

  async function reload() {
    const contacts = await loadContacts(userId)
    setState({ contacts, isLoading: false, error: null })
  }

  useEffect(() => {
    let isCurrent = true
    loadContacts(userId)
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
      // Pausing does not change their phone, so the alert line stays as it was.
      contacts: current.contacts.map((contact) =>
        contact.id === contactId
          ? { ...updated, canReceiveAlerts: contact.canReceiveAlerts }
          : contact,
      ),
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
