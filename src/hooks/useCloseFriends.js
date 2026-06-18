import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useCloseFriends() {
  const { session } = useAuthStore()
  const userId = session?.user?.id
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const { data, error: e } = await supabase
      .from('close_friends')
      .select('friend:profiles!close_friends_friend_profile_id_fkey(id, pharmacy_name, city, country, photo_url)')
      .eq('owner_id', session.user.id)
    if (e) setError(e.message)
    setFriends((data ?? []).map((r) => r.friend).filter(Boolean))
    setLoading(false)
  }, [session, userId])

  useEffect(() => { load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback(async (friendProfileId) => {
    if (!session) return
    const { error: e } = await supabase
      .from('close_friends')
      .insert({ owner_id: session.user.id, friend_profile_id: friendProfileId })
    if (e) { setError(e.message); return }
    await load()
  }, [session, load])

  const remove = useCallback(async (friendProfileId) => {
    if (!session) return
    const { error: e } = await supabase
      .from('close_friends')
      .delete()
      .match({ owner_id: session.user.id, friend_profile_id: friendProfileId })
    if (e) { setError(e.message); return }
    await load()
  }, [session, load])

  return {
    friends,
    friendIds: friends.map((f) => f.id),
    loading,
    error,
    add,
    remove,
  }
}
