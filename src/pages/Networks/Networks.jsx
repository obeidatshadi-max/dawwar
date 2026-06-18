import { useNavigate } from 'react-router-dom'
import { useNetworks } from '../../hooks/useNetworks'
import CloseFriends from './CloseFriends'

export default function Networks() {
  const navigate = useNavigate()
  const { networks, loading } = useNetworks()

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-brand-text text-xl font-bold">شبكاتي</h1>
        <button
          onClick={() => navigate('/networks/new')}
          className="text-brand-primary text-sm font-medium"
        >
          + إنشاء شبكة
        </button>
      </div>

      <CloseFriends />

      {networks.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-brand-text font-semibold mb-2">لا توجد شبكات بعد</p>
          <p className="text-brand-muted text-sm mb-6">أنشئ شبكة أو انضم إحدى الشبكات برابط دعوة</p>
          <button
            onClick={() => navigate('/networks/new')}
            className="px-6 py-3 bg-brand-primary text-white rounded-xl font-semibold"
          >
            إنشاء شبكة جديدة
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 px-4 pb-6">
        {networks.map((n) => (
          <div key={n.id} className="bg-brand-card border border-brand-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-brand-text font-semibold">{n.name}</h3>
              {n.role === 'admin' && (
                <span className="text-xs text-brand-primary border border-brand-primary px-2 py-0.5 rounded-full">
                  مدير
                </span>
              )}
            </div>
            <p className="text-brand-muted text-sm mb-3">{n.city} · {n.country}</p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/feed?network=${n.id}`)}
                className="flex-1 py-2 rounded-xl bg-brand-primary text-white text-sm"
              >
                الرئيسية
              </button>
              {n.role === 'admin' && (
                <button
                  onClick={() => navigate(`/networks/${n.id}/admin`)}
                  className="flex-1 py-2 rounded-xl border border-brand-border text-brand-muted text-sm"
                >
                  إدارة
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
