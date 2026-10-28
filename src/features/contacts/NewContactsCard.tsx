import NotificationCard from '../notifications/NotificationCard.tsx'
import { joinNames } from './newContacts.ts'
import { useNewContacts } from './useNewContacts.ts'
import './contacts.css'

type NewContactsCardProps = {
  userId: string
  onOpenContacts: () => void
}

/**
 * After an invite is accepted, both people open the app and see that it worked. Testers opened the
 * Home Screen app after accepting and found nothing that said so.
 */
function NewContactsCard({ userId, onOpenContacts }: NewContactsCardProps) {
  const { contacts, dismiss } = useNewContacts(userId)
  if (contacts.length === 0) return null

  const names = joinNames(contacts.map((contact) => contact.label))
  const start = contacts.length === 1 ? 'starts' : 'start'

  return (
    <>
      <section className="card contacts-new" aria-labelledby="contacts-new-title">
        <h2 id="contacts-new-title">You and {names} now look out for each other</h2>
        <p>
          WayBack tells you when {names} {start} a walk home, and if a check-in is missed. You are
          looked out for in the same way.
        </p>
        <div className="contacts-new-actions">
          <button
            type="button"
            onClick={() => {
              dismiss()
              onOpenContacts()
            }}
          >
            See contacts
          </button>
          <button type="button" className="button-link" onClick={dismiss}>
            Close
          </button>
        </div>
      </section>
      <NotificationCard
        reason={`So you hear about ${names}’s walks, also when the app is closed.`}
      />
    </>
  )
}

export default NewContactsCard
