import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThread } from '../../hooks/useMessages'

export default function Thread() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const { messages, loading, error, send } = useThread(postId)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const bottomRef = useRef(null)
  const myId = session?.user?.id

  const recipientId = messages.find((m) => m.sender?.id !== myId)?.sender?.id ?? null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!body.trim() || !recipientId) return
    setSending(true)
    setSendErr('')
    try {
      await send({ recipientId, body })
      setBody('')
    } catch (err) {
      setSendErr(err?.message ?? 'خطأ في الإرسال')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const otherName = messages.find((m) => m.sender?.id !== myId)?.sender?.pharmacy_name ?? 'المحادثة'

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-brand-border">
        <button onClick={() => navigate('/messages')} className="text-brand-muted" aria-label="رجوع">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-brand-text font-semibold text-base flex-1">{otherName}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 flex flex-col gap-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && <p className="text-brand-error text-sm text-center">{error}</p>}

        {messages.map((msg) => {
          const isMe = msg.sender?.id === myId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                isMe
                  ? 'bg-brand-primary text-white rounded-br-sm'
                  : 'bg-brand-card border border-brand-border text-brand-text rounded-bl-sm'
              }`}>
                {msg.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-20 inset-x-0 bg-brand-card border-t border-brand-border px-4 py-3 flex gap-3">
        {sendErr && <p className="text-brand-error text-xs mb-1 absolute -top-6 right-4">{sendErr}</p>}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="اكتب رسالتك..."
          className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-primary resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending || !recipientId}
          className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center disabled:opacity-40"
          aria-label="إرسال"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
