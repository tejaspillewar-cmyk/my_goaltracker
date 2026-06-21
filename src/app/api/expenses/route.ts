import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/expenses?date=YYYY-MM-DD — Get all expenses for a date
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

    // Get meals with items
    const { data: meals } = await supabase
      .from('expense_meals')
      .select('*, expense_meal_items(*)')
      .eq('user_id', userData.id)
      .eq('expense_date', date)
      .order('meal_type');

    // Get other expenses
    const { data: others } = await supabase
      .from('expense_others')
      .select('*')
      .eq('user_id', userData.id)
      .eq('expense_date', date)
      .order('category');

    const mealsList = meals || [];
    const othersList = others || [];

    const totalMeals = mealsList.reduce((sum, m) => sum + Number(m.total_cost || 0), 0);
    const totalOthers = othersList.reduce((sum, o) => sum + Number(o.amount || 0), 0);

    return NextResponse.json({
      date,
      meals: mealsList,
      others: othersList,
      total_meals: totalMeals,
      total_others: totalOthers,
      grand_total: totalMeals + totalOthers,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
