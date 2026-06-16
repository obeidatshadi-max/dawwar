import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useUnreadCount() {
  const { session } = useAuthStore()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!session) return
    let cancelled = false

    async function fetchCount() {
      const { count: c } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', session.user.id)
        .is('read_at', null)
      if (!cancelled) setCount(c ?? 0)
    }

    fetchCount()

    const channel = supabase
      .channel('unread-count')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `recipient_id=eq.${session.user.id}`,
      }, fetchCount)
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [session])

  return count
}

export function useMessages() {
  const { session } = useAuthStore()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchThreads = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('messages')
        .select(`
          id, post_id, body, created_at, read_at,
          sender:profiles!messages_sender_id_fkey(id, pharmacy_name),
          recipient:profiles!messages_recipient_id_fkey(id, pharmacy_name),
          post:posts(id, product_name, type)
        `)
        .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr

      const seen = new Set()
      const grouped = (data ?? []).filter((m) => {
        if (seen.has(m.post_id)) return false
        seen.add(m.post_id)
        return true
      })

      setThreads(grouped)
    } catch (err) {
      setError(err?.message ?? 'خطأ في تحميل الرسائل')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { fetchThreads() }, [fetchThreads])

  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel('inbox')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
      }, fetchThreads)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session, fetchThreads])

  return { threads, loading, error }
}

export function useThread(postId) {
  const { session } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMessages = useCallback(async () => {
    if (!session || !postId) return
    setLoading(true)
    try {
      const { data, error: fetchErr } = await supabase
        .from('messages')
        .select(`
          id, body, created_at, read_at, media_url, media_type,
          sender:profiles!messages_sender_id_fkey(id, pharmacy_name)
        `)
        .eq('post_id', postId)
        .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .order('created_at', { ascending: true })

      if (fetchErr) throw fetchErr
      setMessages(data ?? [])

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('post_id', postId)
        .eq('recipient_id', session.user.id)
        .is('read_at', null)
    } catch (err) {
      setError(err?.message ?? 'خطأ في تحميل الرسالة')
    } finally {
      setLoading(false)
    }
  }, [session, postId])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  useEffect(() => {
    if (!session || !postId) return
    const channel = supabase
      .channel(`thread-${postId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `post_id=eq.${postId}`,
      }, fetchMessages)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session, postId, fetchMessages])

  async function send({ recipientId, body }) {
    if (!body?.trim() || !session || !postId) return
    const { error: sendErr } = await supabase.from('messages').insert({
      post_id: postId,
      sender_id: session.user.id,
      recipient_id: recipientId,
      body: body.trim(),
    })
    if (sendErr) throw sendErr
  }

  return { messages, loading, error, send }
}
