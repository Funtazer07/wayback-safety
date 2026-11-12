import { useEffect, useState } from 'react'
import { MIN_SEARCH_LENGTH, searchPlaces, type Place } from './places.ts'

// Assumption: 300 ms after the last key is quick enough to feel live, and saves a request per key.
const SEARCH_DELAY = 300

type Answer = { query: string; places: Place[]; failed: boolean }

/** Searches while the user types. Only the answer for the latest text counts. */
export function usePlaceSearch(text: string) {
  const query = text.trim()
  const [answer, setAnswer] = useState<Answer | null>(null)
  const isTooShort = query.length < MIN_SEARCH_LENGTH

  useEffect(() => {
    if (isTooShort) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((places) => setAnswer({ query, places, failed: false }))
        .catch(() => {
          if (!controller.signal.aborted) setAnswer({ query, places: [], failed: true })
        })
    }, SEARCH_DELAY)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, isTooShort])

  const current = !isTooShort && answer?.query === query ? answer : null
  return {
    places: current?.places ?? [],
    isSearching: !isTooShort && current === null,
    error: current?.failed ? 'Could not search. Check your connection and try again.' : null,
  }
}
