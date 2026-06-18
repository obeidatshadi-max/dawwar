import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useNetworkMembers() {
  const { session } = useAuthStore()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    let cancelled = false
    async function load() {
      // network ids I belong to
      const { data: mine, error: e1 } = await supabase
        .from('network_members')
        .select('network_id')
        .eq('profile_id', session.user.id)
        .eq('status', 'active')
      if (e1) { if (!cancelled) { setError(e1.message); setLoading(false) }; return }
      const networkIds = (mine ?? []).map((m) => m.network_id)
      if (networkIds.length === 0) {
        if (!cancelled) { setMembers([]); setLoading(false) }
        return
      }
      // all active members of those networks + their profiles
      const { data, error: e2 } = await supabase
        .from('network_members')
        .select('profile:profiles(id, pharmacy_name, city, country, photo_url)')
        .in('network_id', networkIds)
        .eq('status', 'active')
      if (cancelled) return
      if (e2) { setError(e2.message); setLoading(false); return }
      const seen = new Set()
      const deduped = []
      for (const row of data ?? []) {
        const p = row.profile
        if (!p || p.id === session.user.id || seen.has(p.id)) continue
        seen.add(p.id)
        deduped.push(p)
      }
      setMembers(deduped)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [session])

  return { members, loading, error }
}
