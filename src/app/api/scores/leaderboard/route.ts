import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// GET /api/scores/leaderboard?month=MM&year=YYYY
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get('month'));
    const year = Number(searchParams.get('year'));

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year parameters are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if we have a frozen snapshot for this month
    const { data: snapshots } = await supabase
      .from('leaderboard_snapshots')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .order('rank', { ascending: true });

    if (snapshots && snapshots.length > 0) {
      return NextResponse.json(snapshots);
    }

    // No snapshot — compute live leaderboard from monthly_scores
    const adminClient = createAdminClient();

    const { data: scores, error } = await adminClient
      .from('monthly_scores')
      .select('*, users(display_name, is_active)')
      .eq('year', year)
      .eq('month', month);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!scores || scores.length === 0) {
      return NextResponse.json([]);
    }

    // Filter active users and sort with tie-breaking
    const activeScores = scores
      .filter((s: Record<string, unknown>) => {
        const users = s.users as { is_active: boolean; display_name: string } | null;
        return users?.is_active;
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aPct = Number(a.performance_pct);
        const bPct = Number(b.performance_pct);
        if (bPct !== aPct) return bPct - aPct;

        const aScore = Number(a.total_score);
        const bScore = Number(b.total_score);
        if (bScore !== aScore) return bScore - aScore;

        const aDays = Number(a.active_days);
        const bDays = Number(b.active_days);
        if (bDays !== aDays) return bDays - aDays;

        const aUsers = a.users as { display_name: string };
        const bUsers = b.users as { display_name: string };
        return aUsers.display_name.localeCompare(bUsers.display_name);
      });

    const leaderboard = activeScores.map((s: Record<string, unknown>, idx: number) => {
      const users = s.users as { display_name: string };
      return {
        rank: idx + 1,
        user_id: s.user_id,
        display_name: users.display_name,
        total_score: s.total_score,
        max_possible_score: s.max_possible_score,
        performance_pct: s.performance_pct,
        active_days: s.active_days,
      };
    });

    return NextResponse.json(leaderboard);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
