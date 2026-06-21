import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// Vercel Cron Job: Snapshot leaderboard for the previous month
// Runs at midnight IST on the 1st (or last days of month)
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate the previous month
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    let year = istNow.getFullYear();
    let month = istNow.getMonth(); // 0-indexed, so this is the previous month if we're on the 1st

    // If we're running on the last days of a month, snapshot the current month
    const day = istNow.getDate();
    if (day >= 28) {
      month = istNow.getMonth() + 1; // Current month (1-indexed)
    } else {
      // We're on the 1st of a new month — snapshot the previous month
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient.rpc('snapshot_leaderboard', {
      p_year: year,
      p_month: month,
    });

    if (error) {
      console.error('Leaderboard snapshot error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Snapshot created for ${year}-${month}`,
    });
  } catch (err) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
