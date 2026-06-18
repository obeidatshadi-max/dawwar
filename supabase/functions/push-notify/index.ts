// Supabase Edge Function: push-notify
// Called by the on_message_push trigger. Signs a payload with VAPID and
// delivers it to every push subscription belonging to the recipient.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const HOOK_SECRET = Deno.env.get('PUSH_HOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(
  'mailto:shadi@psychologytobusiness.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE,
)

Deno.serve(async (req) => {
  if (req.headers.get('x-hook-secret') !== HOOK_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  const { recipient_id, post_id, body } = await req.json()
  if (!recipient_id) return new Response('no recipient', { status: 400 })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('profile_id', recipient_id)

  if (!subs?.length) return new Response('no subscriptions', { status: 200 })

  const payload = JSON.stringify({
    title: '📩 طلب جديد على دوّار',
    body: (body ?? '').slice(0, 80) || 'لديك رسالة جديدة',
    url: post_id ? `/messages/${post_id}` : '/messages',
    tag: `post-${post_id}`,
  })

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
      } catch (err) {
        // 404/410 = subscription gone; clean it up.
        const code = (err as { statusCode?: number })?.statusCode
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        } else {
          console.error('[push-notify] send error', code, err)
        }
      }
    }),
  )

  return new Response('ok', { status: 200 })
})
