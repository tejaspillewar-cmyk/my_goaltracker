import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/entries/matrix?month=MM&year=YYYY — Full month matrix
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get('month'));
    const year = Number(searchParams.get('year'));

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Valid month and year parameters are required' },
        { status: 400 }
      );
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

    // Calculate date range
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // last day

    // Get all active goals
    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    // Get all entries for the month
    const { data: entries } = await supabase
      .from('goal_entries')
      .select('*')
      .eq('user_id', userData.id)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);

    // Get daily scores for the month
    const { data: dailyScores } = await supabase
      .from('daily_scores')
      .select('*')
      .eq('user_id', userData.id)
      .gte('score_date', startDate)
      .lte('score_date', endDate);

    return NextResponse.json({
      goals: goals || [],
      entries: entries || [],
      dailyScores: dailyScores || [],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
