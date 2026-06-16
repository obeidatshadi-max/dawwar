import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useNetworks() {
  const { session } = useAuthStore()
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    let cancelled = false
    async function fetch() {
      const { data, error: fetchErr } = await supabase
        .from('network_members')
        .select('network_id, role, networks(id, name, city, country)')
        .eq('profile_id', session.user.id)
        .eq('status', 'active')
      if (!cancelled) {
        if (fetchErr) setError(fetchErr.message)
        setNetworks(data?.map((m) => ({ ...m.networks, role: m.role })) ?? [])
        setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [session])

  return { networks, loading, error }
}
