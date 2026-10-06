import { type FormEvent, useState } from 'react'
import { HOME } from './destination.ts'

type DestinationSheetProps = {
  destination: string
  onUse: (destination: string) => void
  onClose: () => void
}

/** Screen 1b of the walk wireframe: pick the saved place or type an address. */
function DestinationSheet({ destination, onUse, onClose }: DestinationSheetProps) {
  const [address, setAddress] = useState(destination === HOME ? '' : destination)
  const isHomeSelected = address.trim() === ''

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onUse(isHomeSelected ? HOME : address.trim())
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="destination-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="destination-title">Where are you going?</h2>

        <button
          type="button"
          className="walk-card walk-place"
          aria-pressed={isHomeSelected}
          onClick={() => setAddress('')}
        >
          <span>
            <span className="walk-small">Saved place</span>
            <strong>{HOME}</strong>
          </span>
          {isHomeSelected && <span>Selected ✓</span>}
        </button>

        <label htmlFor="address">Or type an address</label>
        <input
          id="address"
          autoComplete="off"
          placeholder="e.g. Kruisstraat 12, Eindhoven"
          maxLength={120}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />

        <div className="screen-actions">
          <button type="submit" className="button-primary">
            Use this place
          </button>
          <button type="button" className="button-link" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default DestinationSheet
