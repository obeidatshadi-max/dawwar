import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { haversineKm } from '../lib/mediaUtils'

export function useFeed({ networkId, filter = 'all', search = '', sortBy = 'newest', viewerLat, viewerLng, radiusKm = null }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPosts = useCallback(async () => {
    if (!networkId) return
    setLoading(true)
    setError('')
    try {
      let query = supabase
        .from('posts')
        .select('*, author:profiles(id, pharmacy_name, city, lat, lng, phone), media:post_media(type, storage_url)')
        .eq('network_id', networkId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('type', filter)
      if (search.trim()) query = query.ilike('product_name', `%${search.trim()}%`)

      const { data, error: fetchErr } = await query
      if (fetchErr) throw fetchErr

      let result = data ?? []

      if (viewerLat && viewerLng) {
        result = result.map((p) => ({
          ...p,
          _distKm: (p.author?.lat && p.author?.lng)
            ? haversineKm(viewerLat, viewerLng, p.author.lat, p.author.lng)
            : null,
        }))
        if (radiusKm) {
          result = result.filter((p) => p._distKm !== null && p._distKm <= radiusKm)
        }
        if (sortBy === 'nearest') {
          result = [...result].sort((a, b) => (a._distKm ?? Infinity) - (b._distKm ?? Infinity))
        }
      }

      setPosts(result)
    } catch (err) {
      setError(err?.message ?? 'خطأ في تحميل المنشورات')
    } finally {
      setLoading(false)
    }
  }, [networkId, filter, search, sortBy, viewerLat, viewerLng, radiusKm])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    if (!networkId) return
    const channel = supabase
      .channel(`feed-${networkId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: `network_id=eq.${networkId}`,
      }, () => fetchPosts())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [networkId, fetchPosts])

  return { posts, loading, error, refetch: fetchPosts }
}
