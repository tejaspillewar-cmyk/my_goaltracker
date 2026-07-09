import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/expenses/monthly-days?month=MM&year=YYYY
// Returns per-day expense totals for a month: [{ date, total }]
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get('month'));
    const year = Number(searchParams.get('year'));

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const [{ data: meals }, { data: others }] = await Promise.all([
      supabase
        .from('expense_meals')
        .select('expense_date, total_cost')
        .eq('user_id', userData.id)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate),
      supabase
        .from('expense_others')
        .select('expense_date, amount')
        .eq('user_id', userData.id)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate),
    ]);

    // Aggregate by date
    const dayTotals: Record<string, number> = {};
    for (const m of meals || []) {
      dayTotals[m.expense_date] = (dayTotals[m.expense_date] || 0) + Number(m.total_cost || 0);
    }
    for (const o of others || []) {
      dayTotals[o.expense_date] = (dayTotals[o.expense_date] || 0) + Number(o.amount || 0);
    }

    const result = Object.entries(dayTotals)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
