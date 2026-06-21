import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/expenses/monthly?month=MM&year=YYYY — Monthly summary
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

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // Get all meals for the month
    const { data: meals } = await supabase
      .from('expense_meals')
      .select('meal_type, total_cost')
      .eq('user_id', userData.id)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    // Get all other expenses for the month
    const { data: others } = await supabase
      .from('expense_others')
      .select('category, amount')
      .eq('user_id', userData.id)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    // Aggregate by meal type
    const totalByMeal: Record<string, number> = {};
    let totalFood = 0;
    (meals || []).forEach((m: { meal_type: string; total_cost: number }) => {
      const cost = Number(m.total_cost || 0);
      totalByMeal[m.meal_type] = (totalByMeal[m.meal_type] || 0) + cost;
      totalFood += cost;
    });

    // Aggregate by category
    const totalByCategory: Record<string, number> = {};
    let totalOthers = 0;
    (others || []).forEach((o: { category: string; amount: number }) => {
      const amt = Number(o.amount || 0);
      totalByCategory[o.category] = (totalByCategory[o.category] || 0) + amt;
      totalOthers += amt;
    });

    return NextResponse.json({
      year,
      month,
      total_food: totalFood,
      total_by_meal: totalByMeal,
      total_by_category: totalByCategory,
      grand_total: totalFood + totalOthers,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
