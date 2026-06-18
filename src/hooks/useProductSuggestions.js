import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { COMMON_DRUGS } from '../lib/filters'

// Distinct product names seen in a network, merged with a common-drugs seed
// list so autocomplete is useful even when the feed is nearly empty.
export function useProductSuggestions(networkId) {
  const [names, setNames] = useState(COMMON_DRUGS)

  useEffect(() => {
    if (!networkId) return
    let cancelled = false
    supabase
      .from('posts')
      .select('product_name')
      .eq('network_id', networkId)
      .eq('status', 'active')
      .then(({ data }) => {
        if (cancelled || !data) return
        const fromFeed = data.map((r) => r.product_name).filter(Boolean)
        const merged = Array.from(new Set([...fromFeed, ...COMMON_DRUGS]))
        setNames(merged)
      })
    return () => { cancelled = true }
  }, [networkId])

  return names
}
