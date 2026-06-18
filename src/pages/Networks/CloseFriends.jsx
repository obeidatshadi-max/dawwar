import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCloseFriends } from '../../hooks/useCloseFriends'
import { useNetworkMembers } from '../../hooks/useNetworkMembers'

const DEMO_FRIENDS = [
  { id: 'demo-a', pharmacy_name: 'صيدلية الرافدين', city: 'بغداد' },
  { id: 'demo-b', pharmacy_name: 'صيدلية الأمل', city: 'البصرة' },
]

function Avatar({ pharmacy_name, photo_url }) {
  if (photo_url) {
    return <img src={photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold flex-shrink-0">
      {pharmacy_name?.[0] ?? '؟'}
    </div>
  )
}

export default function CloseFriends() {
  const navigate = useNavigate()
  const { friends, friendIds, add, remove } = useCloseFriends()
  const { members } = useNetworkMembers()
  const [picking, setPicking] = useState(false)

  return (
    <div className="px-4 pt-2 pb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-brand-text font-bold">الأصدقاء المقرّبون</h2>
        <div className="flex gap-3">
          {friends.length > 0 && (
            <button onClick={() => navigate('/feed?friends=1')} className="text-brand-primary text-sm font-medium">
              عروضهم
            </button>
          )}
          <button onClick={() => setPicking(true)} className="text-brand-primary text-sm font-medium">
            ＋ إضافة
          </button>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-brand-muted text-xs mb-1">اختر صيدليات من شبكتك لمتابعة عروضهم أولاً</p>
          {DEMO_FRIENDS.map((d) => (
            <div key={d.id} className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-center gap-3 opacity-50">
              <Avatar pharmacy_name={d.pharmacy_name} />
              <div className="flex-1">
                <p className="text-brand-text text-sm font-medium">{d.pharmacy_name}</p>
                <p className="text-brand-muted text-xs">{d.city}</p>
              </div>
              <span className="text-[10px] text-brand-muted border border-brand-border px-2 py-0.5 rounded-full">مثال</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {friends.map((f) => (
            <div key={f.id} className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-center gap-3">
              <Avatar pharmacy_name={f.pharmacy_name} photo_url={f.photo_url} />
              <div className="flex-1">
                <p className="text-brand-text text-sm font-medium">{f.pharmacy_name}</p>
                <p className="text-brand-muted text-xs">{f.city}</p>
              </div>
              <button onClick={() => remove(f.id)} className="text-brand-muted text-xs" aria-label={`إزالة ${f.pharmacy_name}`}>
                إزالة
              </button>
            </div>
          ))}
        </div>
      )}

      {picking && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-end" onClick={() => setPicking(false)}>
          <div className="bg-brand-bg w-full rounded-t-2xl max-h-[70vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-brand-text font-bold">إضافة صديق مقرّب</h3>
              <button onClick={() => setPicking(false)} className="text-brand-muted text-sm">إغلاق</button>
            </div>
            {members.length === 0 && (
              <p className="text-brand-muted text-sm py-6 text-center">لا يوجد أعضاء في شبكتك بعد</p>
            )}
            <div className="flex flex-col gap-2">
              {members.map((m) => {
                const added = friendIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => (added ? remove(m.id) : add(m.id))}
                    className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-center gap-3 text-right"
                  >
                    <Avatar pharmacy_name={m.pharmacy_name} photo_url={m.photo_url} />
                    <div className="flex-1">
                      <p className="text-brand-text text-sm font-medium">{m.pharmacy_name}</p>
                      <p className="text-brand-muted text-xs">{m.city}</p>
                    </div>
                    <span className={`text-xs font-medium ${added ? 'text-brand-muted' : 'text-brand-primary'}`}>
                      {added ? '✓ مضاف' : '＋'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
