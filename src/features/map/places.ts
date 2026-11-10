import { fetchJson } from './fetchJson.ts'
import type { LngLat } from './geometry.ts'

export type Place = {
  id: string
  /** As PDOK writes it: "Stratumseind 32, 5611ET Eindhoven". */
  label: string
  coordinates: LngLat
}

type PdokDoc = {
  id: string
  weergavenaam: string
  centroide_ll: string
}

type PdokAnswer = {
  response: { docs: PdokDoc[] }
}

// The national address register (Kadaster), free and without a key, made for search-as-you-type.
const searchUrl = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest'

export const MIN_SEARCH_LENGTH = 2

/** PDOK gives the spot as text: "POINT(5.4813819 51.43644042)", longitude first. */
export function toPlace(doc: PdokDoc): Place | null {
  const match = /^POINT\((-?[\d.]+) (-?[\d.]+)\)$/.exec(doc.centroide_ll)
  if (!match) return null
  return { id: doc.id, label: doc.weergavenaam, coordinates: [Number(match[1]), Number(match[2])] }
}

/** Addresses, streets and postcodes in Eindhoven that match what the user typed. */
export async function searchPlaces(text: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    q: text,
    fl: 'id,weergavenaam,centroide_ll',
    rows: '5',
  })
  // The app only plans walks in Eindhoven, so places elsewhere are left out.
  params.append('fq', 'gemeentenaam:Eindhoven')
  params.append('fq', 'type:(adres OR weg OR postcode)')
  const answer = (await fetchJson(`${searchUrl}?${params}`, signal)) as PdokAnswer
  return answer.response.docs.flatMap((doc) => toPlace(doc) ?? [])
}
