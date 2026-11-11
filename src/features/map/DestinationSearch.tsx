import { useState } from 'react'
import { HOME } from '../walk/destination.ts'
import type { LngLat } from './geometry.ts'
import HomeShortcut from './HomeShortcut.tsx'
import PlaceSearch from './PlaceSearch.tsx'
import { clearHome, loadHome, saveHome, type SavedHome } from './savedHome.ts'

type DestinationSearchProps = {
  onGo: (coordinates: LngLat, label: string) => void
}

/** The search bar with the Home button under it. Saving a home also plans the walk there. */
function DestinationSearch({ onGo }: DestinationSearchProps) {
  const [home, setHome] = useState(loadHome)
  const [isSettingHome, setIsSettingHome] = useState(false)
  // A new key empties the search field.
  const [fieldKey, setFieldKey] = useState(0)

  function goHome(saved: SavedHome) {
    setFieldKey((key) => key + 1)
    onGo(saved.coordinates, HOME)
  }

  return (
    <>
      <PlaceSearch
        key={fieldKey}
        onChoose={(place) => {
          if (!isSettingHome) {
            onGo(place.coordinates, place.label)
            return
          }
          const saved = { label: place.label, coordinates: place.coordinates }
          saveHome(saved)
          setHome(saved)
          setIsSettingHome(false)
          goHome(saved)
        }}
      />
      <HomeShortcut
        home={home}
        isSettingHome={isSettingHome}
        onGoHome={goHome}
        onSetHome={() => setIsSettingHome(true)}
        onCancel={() => setIsSettingHome(false)}
        onRemove={() => {
          clearHome()
          setHome(null)
          setIsSettingHome(false)
        }}
      />
    </>
  )
}

export default DestinationSearch
