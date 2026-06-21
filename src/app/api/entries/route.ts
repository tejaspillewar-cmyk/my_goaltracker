import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// GET /api/entries?date=YYYY-MM-DD — Get entries for a date (own)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: entries, error } = await supabase
      .from('goal_entries')
      .select('*, goals(name, score_value)')
      .eq('user_id', userData.id)
      .eq('entry_date', date);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/entries — Upsert an entry (toggle check/uncheck)
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { goal_id, entry_date, is_checked } = body;

    if (!goal_id || !entry_date || typeof is_checked !== 'boolean') {
      return NextResponse.json(
        { error: 'goal_id, entry_date, and is_checked are required' },
        { status: 400 }
      );
    }

    // Validate date is not in the future
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (entry_date > today) {
      return NextResponse.json(
        { error: 'Cannot create entries for future dates' },
        { status: 400 }
      );
    }

    // Server-side 3-day window enforcement (unless admin)
    if (userData.role !== 'admin') {
      const todayDate = new Date(today + 'T00:00:00+05:30');
      const cutoff = new Date(todayDate);
      cutoff.setDate(cutoff.getDate() - 2);
      const cutoffStr = cutoff.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      if (entry_date < cutoffStr) {
        return NextResponse.json(
          { error: 'This date is locked. You can only edit the last 3 days.' },
          { status: 403 }
        );
      }
    }

    // Use the atomic upsert RPC function
    const adminClient = createAdminClient();
    const { error: rpcError } = await adminClient.rpc('upsert_goal_entry', {
      p_user_id: userData.id,
      p_goal_id: goal_id,
      p_entry_date: entry_date,
      p_is_checked: is_checked,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
