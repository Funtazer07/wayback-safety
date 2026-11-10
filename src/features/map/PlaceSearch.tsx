import { useState, type FormEvent } from 'react'
import { MIN_SEARCH_LENGTH, type Place } from './places.ts'
import { usePlaceSearch } from './usePlaceSearch.ts'

type PlaceSearchProps = {
  onChoose: (place: Place) => void
}

/** "Where are you going?": type an address, street or postcode, like in a maps app. */
function PlaceSearch({ onChoose }: PlaceSearchProps) {
  const [text, setText] = useState('')
  const [chosenLabel, setChosenLabel] = useState<string | null>(null)
  // After a choice the field shows the place's name; that is no new search.
  const search = usePlaceSearch(text === chosenLabel ? '' : text)
  const isOpen = text.trim().length >= MIN_SEARCH_LENGTH && text !== chosenLabel

  function choose(place: Place) {
    setText(place.label)
    setChosenLabel(place.label)
    onChoose(place)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (search.places[0]) choose(search.places[0])
  }

  return (
    <form className="place-search" role="search" onSubmit={handleSubmit}>
      <label className="place-search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 21 21" />
        </svg>
        <span className="place-search-label">Where are you going?</span>
        <input
          type="search"
          value={text}
          placeholder="Where are you going?"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      {text !== '' && (
        <button
          type="button"
          className="place-search-clear"
          aria-label="Clear search"
          onClick={() => {
            setText('')
            setChosenLabel(null)
          }}
        >
          ×
        </button>
      )}
      {isOpen && (
        <div className="place-results">
          {search.isSearching && <p role="status">Searching…</p>}
          {search.error && <p role="alert">{search.error}</p>}
          {!search.isSearching && !search.error && search.places.length === 0 && (
            <p role="status">No address found in Eindhoven. Try a street name or a postcode.</p>
          )}
          {search.places.length > 0 && (
            <ul aria-label="Places found">
              {search.places.map((place) => (
                <li key={place.id}>
                  <button type="button" onClick={() => choose(place)}>
                    {place.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}

export default PlaceSearch
