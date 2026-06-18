import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { compressImage, uploadMedia } from '../../lib/mediaUtils'

export default function Profile() {
  const navigate = useNavigate()
  const { session, profile, setProfile, clear } = useAuthStore()
  const isAdmin = session?.user?.email === 'shadi@psychologytobusiness.com'

  const [editing, setEditing] = useState(false)
  const [pharmacyName, setPharmacyName] = useState(profile?.pharmacy_name ?? '')
  const [ownerName, setOwnerName] = useState(profile?.owner_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const photoInputRef = useRef(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoUploading(true)
    setError('')
    try {
      const blob = await compressImage(file)
      const url = await uploadMedia(supabase, 'post-media', `pharmacy/${profile.id}.jpg`, blob, 'image/jpeg')
      const bust = `${url}?t=${Date.now()}`
      const { error: e2 } = await supabase.from('profiles').update({ photo_url: url }).eq('id', profile.id)
      if (e2) throw e2
      setProfile({ ...profile, photo_url: bust })
    } catch (err) {
      console.error('[photo upload]', err)
      setError('تعذر رفع الصورة')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handleSave() {
    if (saving) return
    if (!pharmacyName.trim() || !ownerName.trim() || !city.trim()) {
      setError('جميع الحقول مطلوبة')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updates = {
        pharmacy_name: pharmacyName.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        city: city.trim(),
      }
      const { error: saveErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
      if (saveErr) throw saveErr
      setProfile({ ...profile, ...updates })
      setEditing(false)
    } catch (err) {
      setError(err?.message ?? 'خطأ في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    clear()
    navigate('/onboarding', { replace: true })
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-brand-text text-xl font-bold">حسابي</h1>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-brand-primary text-sm">
            تعديل
          </button>
        )}
      </div>

      <div className="px-4 flex flex-col gap-5">
        {/* Avatar */}
        <div className="flex items-center gap-4 bg-brand-card border border-brand-border rounded-2xl p-4">
          <button
            type="button"
            onClick={() => editing && photoInputRef.current?.click()}
            className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden relative"
          >
            {profile.photo_url
              ? <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
              : (profile.pharmacy_name?.[0] ?? '؟')}
            {editing && (
              <span className="absolute inset-0 bg-black/30 flex items-center justify-center text-xs">
                {photoUploading ? '...' : '📷'}
              </span>
            )}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="hidden"
            aria-label="صورة الصيدلية"
          />
          <div>
            <p className="text-brand-text font-semibold">{profile.pharmacy_name}</p>
            <p className="text-brand-muted text-sm">
              {profile.city} · {profile.country === 'JO' ? 'الأردن' : 'العراق'}
            </p>
          </div>
        </div>

        {editing ? (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-4 flex flex-col gap-4">
            {[
              { label: 'اسم الصيدلية', value: pharmacyName, set: setPharmacyName },
              { label: 'اسم صاحب الصيدلية', value: ownerName, set: setOwnerName },
              { label: 'رقم الواتساب', value: phone, set: setPhone, dir: 'ltr' },
              { label: 'المدينة', value: city, set: setCity },
            ].map(({ label, value, set, dir }) => (
              <div key={label}>
                <label className="text-brand-muted text-xs mb-1 block">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  dir={dir}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary text-sm"
                />
              </div>
            ))}

            {error && <p className="text-brand-error text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setEditing(false); setError('') }}
                className="flex-1 py-2.5 border border-brand-border text-brand-muted rounded-xl text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-4 flex flex-col gap-3">
            {[
              ['صاحب الصيدلية', profile.owner_name],
              ['الواتساب', profile.phone],
              ['الموقع', profile.location_label ?? profile.city],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between">
                <span className="text-brand-muted text-sm">{label}</span>
                <span className="text-brand-text text-sm font-medium text-left" dir="auto">
                  {value ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <button
            onClick={() => navigate('/admin/seed')}
            className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold mt-2 flex items-center justify-center gap-2"
          >
            🌱 أداة البذر (مدير)
          </button>
        )}

        <button
          onClick={handleLogout}
          className="w-full py-3 border border-brand-error text-brand-error rounded-xl text-sm font-medium mt-4"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
