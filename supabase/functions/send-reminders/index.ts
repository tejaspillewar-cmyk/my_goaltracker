// Supabase Edge Function — send-reminders
// Runs every minute via Supabase Cron.
// Finds all enabled reminders matching the current UTC minute
// and fires a Web Push notification to each subscribed user.
//
// Deploy:  supabase functions deploy send-reminders
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore — npm: specifier works in Supabase Edge Function runtime (Deno 1.30+)
import webPush from 'npm:web-push@3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL = 'mailto:sanskriti.pandey2004@gmail.com';

webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Current IST time + day-of-week (UTC+5:30)
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}:00`;
  const currentDay  = ist.getUTCDay(); // 0=Sun … 6=Sat

  // Fetch enabled reminders matching this minute AND today's day
  const { data: reminders, error: remErr } = await supabase
    .from('reminders')
    .select('id, text, user_id, days')
    .eq('enabled', true)
    .eq('reminder_time', currentTime)
    .contains('days', [currentDay]);

  if (remErr) {
    console.error('DB error:', remErr.message);
    return new Response(JSON.stringify({ error: remErr.message }), { status: 500 });
  }

  if (!reminders || reminders.length === 0) {
    return new Response(JSON.stringify({ sent: 0, time: currentTime }));
  }

  // For each due reminder, fetch the user's push subscription and send
  const results = await Promise.allSettled(
    reminders.map(async (reminder) => {
      const { data: sub } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', reminder.user_id)
        .single();

      if (!sub?.subscription) return; // user hasn't enabled push

      await webPush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: '⏰ Reminder',
          body: reminder.text,
          icon: '/favicon.ico',
        })
      );
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`[send-reminders] time=${currentTime} sent=${sent} failed=${failed}`);
  return new Response(JSON.stringify({ sent, failed, time: currentTime }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
