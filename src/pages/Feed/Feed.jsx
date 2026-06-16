import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useNetworks } from '../../hooks/useNetworks'
import { useFeed } from '../../hooks/useFeed'
import PostCard from '../../components/PostCard'
import FilterBar from './FilterBar'

export default function Feed() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const { networks, loading: networksLoading } = useNetworks()

  const [selectedNetworkId, setSelectedNetworkId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [radiusKm, setRadiusKm] = useState(null)
  const [search, setSearch] = useState('')

  const networkId = selectedNetworkId ?? networks[0]?.id ?? null

  const { posts, loading: postsLoading, error } = useFeed({
    networkId,
    filter,
    search,
    sortBy,
    viewerLat: profile?.lat,
    viewerLng: profile?.lng,
    radiusKm,
  })

  if (networksLoading) return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (networks.length === 0) return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 text-center">
      <p className="text-brand-text text-lg font-semibold mb-2">لا توجد شبكات بعد</p>
      <p className="text-brand-muted text-sm">انضم إلى شبكة أو أنشئ واحدة من تبويب شبكاتي</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      {networks.length > 1 && (
        <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto scrollbar-none">
          {networks.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedNetworkId(n.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                n.id === networkId
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-card border border-brand-border text-brand-muted'
              }`}
            >
              {n.name}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pt-3 pb-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن منتج... (مثال: Augmentin)"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-2.5 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-primary"
          dir="auto"
        />
      </div>

      <div className="px-4 pb-3">
        <FilterBar
          filter={filter} onFilter={setFilter}
          sortBy={sortBy} onSort={setSortBy}
          radiusKm={radiusKm} onRadius={setRadiusKm}
        />
      </div>

      <div className="px-4 pb-24 flex flex-col gap-4">
        {error && <p className="text-brand-error text-sm text-center">{error}</p>}

        {postsLoading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!postsLoading && posts.length === 0 && !error && (
          <p className="text-brand-muted text-center py-8">لا توجد منشورات</p>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            viewerLat={profile?.lat}
            viewerLng={profile?.lng}
            onMessage={(id) => navigate(`/messages/${id}`)}
            onDetail={(id) => navigate(`/posts/${id}`)}
          />
        ))}
      </div>

      <button
        onClick={() => navigate('/create')}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 w-14 h-14 bg-brand-primary rounded-full shadow-lg flex items-center justify-center z-10"
        aria-label="إنشاء منشور"
      >
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
