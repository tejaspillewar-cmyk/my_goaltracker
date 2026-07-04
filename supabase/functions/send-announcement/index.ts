// Supabase Edge Function — send-announcement
// Called by the admin to push a broadcast notification to all or selected users.
// Deploy: supabase functions deploy send-announcement

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import webPush from 'npm:web-push@3';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL       = 'mailto:sanskriti.pandey2004@gmail.com';

webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let title = '📢 Announcement';
  let body  = '';
  let userIds: string[] | null = null;

  try {
    const json = await req.json();
    title   = json.title   || title;
    body    = json.body    || body;
    userIds = json.userIds || null;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  if (!body.trim()) {
    return new Response(JSON.stringify({ error: 'body is required' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Fetch push subscriptions — filtered by user IDs if provided, otherwise all
  let query = supabase
    .from('push_subscriptions')
    .select('subscription');

  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    query = query.in('user_id', userIds);
  }

  const { data: subs, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No subscribers' }));
  }

  const results = await Promise.allSettled(
    subs.map((row) =>
      webPush.sendNotification(
        row.subscription,
        JSON.stringify({ title, body, icon: '/favicon.ico' })
      )
    )
  );

  const sent   = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`[send-announcement] sent=${sent} failed=${failed}`);
  return new Response(JSON.stringify({ sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
