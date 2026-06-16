import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useMessages } from '../../hooks/useMessages'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `${Math.floor(diff / 60)} د`
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`
  return `${Math.floor(diff / 86400)} ي`
}

export default function Inbox() {
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const { threads, loading, error } = useMessages()
  const myId = session?.user?.id

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-brand-text text-xl font-bold">الرسائل</h1>
      </div>

      {error && <p className="text-brand-error text-sm px-4">{error}</p>}

      {threads.length === 0 && !error && (
        <p className="text-brand-muted text-center py-16">لا توجد رسائل بعد</p>
      )}

      <div className="flex flex-col divide-y divide-brand-border">
        {threads.map((thread) => {
          const other = thread.sender?.id === myId ? thread.recipient : thread.sender
          const isUnread = !thread.read_at && thread.sender?.id !== myId
          return (
            <button
              key={thread.post_id}
              onClick={() => navigate(`/messages/${thread.post_id}`)}
              className="flex items-start gap-3 px-4 py-4 text-right w-full hover:bg-brand-card transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium truncate ${isUnread ? 'text-brand-text' : 'text-brand-muted'}`}>
                    {other?.pharmacy_name ?? '—'}
                  </span>
                  <span className="text-xs text-brand-muted flex-shrink-0 mr-2">{timeAgo(thread.created_at)}</span>
                </div>
                <p className="text-xs text-brand-primary truncate mb-0.5" dir="ltr">
                  {thread.post?.product_name}
                </p>
                <p className={`text-xs truncate ${isUnread ? 'text-brand-text font-medium' : 'text-brand-muted'}`}>
                  {thread.body ?? '—'}
                </p>
              </div>
              {isUnread && (
                <div className="w-2.5 h-2.5 rounded-full bg-brand-primary mt-1.5 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
