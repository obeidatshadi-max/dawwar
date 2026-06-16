import VoicePlayer from './VoicePlayer'
import { haversineKm } from '../lib/mediaUtils'

function discountPct(price, original) {
  if (!original || !price || original <= price) return null
  return Math.round((1 - price / original) * 100)
}

function isExpiryWarning(dateStr) {
  if (!dateStr) return false
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff < 90
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ar-JO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} م`
  return `${km.toFixed(1)} كم`
}

export default function PostCard({ post, viewerLat, viewerLng, onMessage, onDetail }) {
  const { type, product_name, quantity, unit, price, original_price, currency,
    expiry_date, phone, author, media = [] } = post

  const images = media.filter((m) => m.type === 'image')
  const voice = media.find((m) => m.type === 'voice')

  const dist = (viewerLat && viewerLng && author?.lat && author?.lng)
    ? haversineKm(viewerLat, viewerLng, author.lat, author.lng)
    : null

  const pct = discountPct(price, original_price)
  const expiryWarn = isExpiryWarning(expiry_date)

  const waText = encodeURIComponent(`مرحباً، رأيت منشورك على دوّار عن ${product_name}`)
  const waLink = `https://wa.me/${phone?.replace(/\D/g, '')}?text=${waText}`

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${
            type === 'offer' ? 'bg-brand-offer' : 'bg-brand-wanted'
          }`}>
            {type === 'offer' ? 'قرب انتهاء' : 'مطلوب'}
          </span>
          {dist !== null && (
            <span className="text-xs text-brand-muted bg-brand-bg px-2 py-0.5 rounded-full">
              {formatDistance(dist)}
            </span>
          )}
        </div>
        <span className="text-xs text-brand-muted">{author?.pharmacy_name} — {author?.city}</span>
      </div>

      {/* Product info */}
      <div className="px-4 pb-3">
        <h3 className="text-brand-text font-semibold text-base" dir="ltr">{product_name}</h3>
        <p className="text-brand-muted text-sm">{quantity} {unit}</p>

        {type === 'offer' && price && (
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-brand-success font-bold">{price} {currency}</span>
            {original_price && (
              <span className="text-brand-muted text-xs line-through">{original_price} {currency}</span>
            )}
            {pct && <span className="text-brand-offer text-xs font-bold">-{pct}%</span>}
          </div>
        )}

        {expiry_date && (
          <p className={`text-xs mt-1 ${expiryWarn ? 'text-brand-warning' : 'text-brand-muted'}`}>
            {expiryWarn && '⚠ '}انتهاء: {formatDate(expiry_date)}
          </p>
        )}
      </div>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto snap-x scrollbar-none">
          {images.map((img, i) => (
            <img
              key={i}
              src={img.storage_url}
              alt={`صورة ${i + 1}`}
              className="h-32 w-auto rounded-xl object-cover snap-start flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* Voice note */}
      {voice && (
        <div className="px-4 pb-3">
          <VoicePlayer url={voice.storage_url} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4 pt-1 border-t border-brand-border mt-1">
        <button
          onClick={() => onMessage?.(post.id)}
          className="flex-1 py-2 rounded-xl bg-brand-primary text-white text-sm font-medium"
        >
          أريد هذا
        </button>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 rounded-xl bg-brand-whatsapp text-white text-sm font-medium text-center"
        >
          واتساب
        </a>
        <button
          onClick={() => onDetail?.(post.id)}
          className="px-4 py-2 rounded-xl border border-brand-border text-brand-muted text-sm"
        >
          تفاصيل
        </button>
      </div>
    </div>
  )
}
