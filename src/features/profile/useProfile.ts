import { useEffect, useState } from 'react'
import { completeProfile, fetchProfile, type Profile } from './profile.ts'

type ProfileState = {
  profile: Profile | null
  error: string | null
}

/** Loads the profile of the logged-in user. `profile` is null while loading or after an error. */
export function useProfile(userId: string | undefined) {
  const [state, setState] = useState<ProfileState>({ profile: null, error: null })

  useEffect(() => {
    if (!userId) return

    let isCurrent = true
    fetchProfile(userId)
      .then((profile) => isCurrent && setState({ profile, error: null }))
      .catch(() => isCurrent && setState({ profile: null, error: 'Could not load your profile.' }))

    return () => {
      isCurrent = false
      setState({ profile: null, error: null })
    }
  }, [userId])

  async function saveName(displayName: string) {
    if (!userId) return
    await completeProfile(userId, displayName)
    setState({ profile: { displayName }, error: null })
  }

  return { ...state, saveName }
}
