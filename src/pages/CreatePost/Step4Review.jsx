import { useState, useMemo, useEffect } from 'react'
import PostCard from '../../components/PostCard'
import { useAuthStore } from '../../store/authStore'
import { useNetworks } from '../../hooks/useNetworks'
import { supabase } from '../../lib/supabase'
import { compressImage, uploadMedia } from '../../lib/mediaUtils'

export default function Step4Review({ data, onBack, onDone }) {
  const { session, profile } = useAuthStore()
  const { networks } = useNetworks()
  const [selectedNetworks, setSelectedNetworks] = useState([])
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (networks.length > 0 && selectedNetworks.length === 0) {
      setSelectedNetworks(networks.map((n) => n.id))
    }
  }, [networks])

  function toggleNetwork(id) {
    setSelectedNetworks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const previewImageUrls = useMemo(
    () => (data.images ?? []).map((f) => URL.createObjectURL(f)),
    [data.images]
  )
  const previewAudioUrl = useMemo(
    () => data.audioBlob ? URL.createObjectURL(data.audioBlob) : null,
    [data.audioBlob]
  )
  useEffect(() => () => {
    previewImageUrls.forEach((u) => URL.revokeObjectURL(u))
    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl)
  }, [previewImageUrls, previewAudioUrl])

  const previewPost = {
    id: 'preview',
    type: data.type,
    product_name: data.product_name,
    quantity: data.quantity,
    unit: data.unit,
    price: data.price ?? null,
    original_price: data.original_price ?? null,
    currency: data.currency ?? (profile?.country === 'IQ' ? 'IQD' : 'JOD'),
    expiry_date: data.expiry_date ?? null,
    phone: data.phone ?? profile?.phone,
    author: { pharmacy_name: profile?.pharmacy_name, city: profile?.city, lat: profile?.lat, lng: profile?.lng },
    media: [
      ...previewImageUrls.map((url) => ({ type: 'image', storage_url: url })),
      ...(previewAudioUrl ? [{ type: 'voice', storage_url: previewAudioUrl }] : []),
    ],
  }

  async function publish() {
    if (selectedNetworks.length === 0) { setError('اختر شبكة واحدة على الأقل'); return }
    if (publishing) return
    setPublishing(true)
    setError('')
    try {
      for (const networkId of selectedNetworks) {
        const { data: post, error: postErr } = await supabase
          .from('posts')
          .insert({
            network_id: networkId,
            author_id: session.user.id,
            type: data.type,
            product_name: data.product_name,
            quantity: data.quantity,
            unit: data.unit,
            price: data.price,
            original_price: data.original_price,
            currency: data.currency,
            expiry_date: data.expiry_date,
            description: data.description,
            phone: data.phone ?? profile?.phone,
            status: 'active',
          })
          .select('id')
          .single()
        if (postErr) throw postErr

        const postId = post.id

        for (let i = 0; i < (data.images ?? []).length; i++) {
          const blob = await compressImage(data.images[i])
          const url = await uploadMedia(supabase, 'post-media', `images/${postId}/${i}.jpg`, blob, 'image/jpeg')
          await supabase.from('post_media').insert({ post_id: postId, type: 'image', storage_url: url })
        }

        if (data.audioBlob) {
          const url = await uploadMedia(supabase, 'post-media', `voice/${postId}/note.webm`, data.audioBlob, 'audio/webm')
          await supabase.from('post_media').insert({ post_id: postId, type: 'voice', storage_url: url })
        }
      }
      onDone()
    } catch (err) {
      setError(err?.message ?? 'خطأ في النشر — قد يكون المنشور نُشر في بعض الشبكات')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-brand-text text-xl font-bold">مراجعة ونشر</h2>

      <PostCard post={previewPost} />

      {networks.length > 1 && (
        <div>
          <label className="text-brand-muted text-sm mb-2 block">النشر في الشبكات</label>
          {networks.map((n) => (
            <label key={n.id} className="flex items-center gap-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedNetworks.includes(n.id)}
                onChange={() => toggleNetwork(n.id)}
                className="accent-brand-primary w-4 h-4"
              />
              <span className="text-brand-text text-sm">{n.name}</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-brand-error text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={publishing}
          className="flex-1 py-3 border border-brand-border text-brand-muted rounded-xl disabled:opacity-50"
        >
          رجوع
        </button>
        <button
          onClick={publish}
          disabled={publishing}
          className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-semibold disabled:opacity-50"
        >
          {publishing ? 'جارٍ النشر...' : 'نشر'}
        </button>
      </div>
    </div>
  )
}
