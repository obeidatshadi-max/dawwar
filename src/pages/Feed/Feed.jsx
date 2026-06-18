import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useNetworks } from '../../hooks/useNetworks'
import { useFeed } from '../../hooks/useFeed'
import { useCloseFriends } from '../../hooks/useCloseFriends'
import PostCard from '../../components/PostCard'
import FilterBar from './FilterBar'
import ProductSearch from './ProductSearch'
import { useProductSuggestions } from '../../hooks/useProductSuggestions'
import { useNotificationPermission } from '../../hooks/useRequestNotifications'
import { saveProfile } from '../../hooks/useAuth'

function LocationNudge() {
  const { session, profile, setProfile } = useAuthStore()
  const [status, setStatus] = useState('idle') // idle | loading | error

  if (!profile || profile.lat) return null

  async function capture() {
    setStatus('loading')
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      await saveProfile(session.user.id, { ...profile, lat, lng })
      setProfile({ ...profile, lat, lng })
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="mx-4 mt-3 bg-amber-50 border border-amber-300/50 rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-xl">📍</span>
      <div className="flex-1">
        <p className="text-brand-text text-xs leading-relaxed">
          حدّد موقع صيدليتك لتفعيل الفلترة بالمسافة وترتيب الأقرب
        </p>
        {status === 'error' && (
          <p className="text-brand-error text-[11px] mt-1">تعذر تحديد الموقع. تحقق من صلاحية الموقع.</p>
        )}
      </div>
      <button
        onClick={capture}
        disabled={status === 'loading'}
        className="bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-50"
      >
        {status === 'loading' ? '...' : 'تحديد'}
      </button>
    </div>
  )
}

function NotifyBanner() {
  const { permission, request, supported } = useNotificationPermission()
  if (!supported || permission !== 'default') return null
  return (
    <div className="mx-4 mt-3 bg-brand-primary/10 border border-brand-primary/30 rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-xl">🔔</span>
      <p className="flex-1 text-brand-text text-xs leading-relaxed">
        فعّل الإشعارات لتصلك تنبيهات فور وصول طلب جديد
      </p>
      <button
        onClick={request}
        className="bg-brand-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
      >
        تفعيل
      </button>
    </div>
  )
}

const DEMO_POSTS = [
  {
    id: 'demo-1',
    type: 'offer',
    product_name: 'Augmentin 625mg — GSK',
    quantity: 150,
    unit: 'علبة',
    price: 12500,
    original_price: 16000,
    currency: 'IQD',
    expiry_date: '2026-07-31',
    phone: '9647700000001',
    author: { pharmacy_name: 'صيدلية الرافدين', city: 'بغداد', lat: 33.34, lng: 44.40 },
    media: [],
  },
  {
    id: 'demo-2',
    type: 'offer',
    product_name: 'Paracetamol 500mg — Julphar',
    quantity: 500,
    unit: 'علبة',
    price: 2500,
    original_price: 3500,
    currency: 'IQD',
    expiry_date: '2026-12-15',
    phone: '9647700000002',
    author: { pharmacy_name: 'صيدلية الأمل', city: 'البصرة', lat: 30.51, lng: 47.82 },
    media: [],
  },
  {
    id: 'demo-3',
    type: 'wanted',
    product_name: 'Metformin 850mg',
    quantity: 100,
    unit: 'علبة',
    price: null,
    original_price: null,
    currency: 'IQD',
    expiry_date: null,
    phone: '9647700000003',
    author: { pharmacy_name: 'صيدلية النور', city: 'أربيل', lat: 36.19, lng: 44.01 },
    media: [],
  },
]

function DemoFeed() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center py-2">
        <p className="text-brand-muted text-sm">الشبكة فارغة حتى الآن — إليك مثالاً على ما ستبدو عليه العروض</p>
      </div>
      {DEMO_POSTS.map((post) => (
        <PostCard key={post.id} post={post} isDemo />
      ))}
      <p className="text-center text-brand-muted text-xs pb-2">
        ابدأ بنشر عرضك الأول بالنقر على +
      </p>
    </div>
  )
}

export default function Feed() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const friendsMode = searchParams.get('friends') === '1'
  const { friendIds: rawFriendIds } = useCloseFriends()
  const friendIds = useMemo(
    () => (friendsMode ? rawFriendIds : null),
    [friendsMode, rawFriendIds.join(',')]
  )
  const { networks, loading: networksLoading } = useNetworks()

  const [selectedNetworkId, setSelectedNetworkId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [radiusKm, setRadiusKm] = useState(null)
  const [expiryFilter, setExpiryFilter] = useState(null)
  const [search, setSearch] = useState('')

  const networkId = selectedNetworkId ?? networks[0]?.id ?? null
  const suggestions = useProductSuggestions(networkId)

  const { posts, loading: postsLoading, error } = useFeed({
    networkId,
    filter,
    search,
    sortBy,
    viewerLat: profile?.lat,
    viewerLng: profile?.lng,
    radiusKm,
    expiryFilter,
    friendIds,
  })

  if (networksLoading) return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (networks.length === 0) return (
    <div className="min-h-screen bg-brand-bg pb-24">
      <NotifyBanner />
      <div className="px-4 pt-8 pb-4 text-center">
        <p className="text-brand-text text-lg font-semibold">أهلاً في دوّار 🌿</p>
        <p className="text-brand-muted text-sm mt-1">ابدأ بإنشاء شبكة أو الانضمام إلى واحدة — هكذا تبدو العروض</p>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => navigate('/networks/new')}
          className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold"
        >
          إنشاء شبكة جديدة
        </button>
        <button
          onClick={() => navigate('/networks')}
          className="w-full py-2.5 mt-2 border border-brand-border text-brand-muted rounded-xl text-sm font-medium"
        >
          لديّ رابط دعوة — انضمام لشبكة
        </button>
      </div>
      <div className="px-4 flex flex-col gap-4">
        <DemoFeed />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      <NotifyBanner />
      <LocationNudge />
      {friendsMode && (
        <div className="px-4 pt-3">
          <p className="text-brand-text text-sm font-medium">عروض الأصدقاء المقرّبين</p>
          <button onClick={() => navigate('/feed')} className="text-brand-primary text-xs">عرض كل العروض</button>
        </div>
      )}
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
        <ProductSearch value={search} onChange={setSearch} suggestions={suggestions} />
      </div>

      <div className="px-4 pb-3">
        <FilterBar
          filter={filter} onFilter={setFilter}
          sortBy={sortBy} onSort={setSortBy}
          radiusKm={radiusKm} onRadius={setRadiusKm}
          expiryFilter={expiryFilter} onExpiry={setExpiryFilter}
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
          <DemoFeed />
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
