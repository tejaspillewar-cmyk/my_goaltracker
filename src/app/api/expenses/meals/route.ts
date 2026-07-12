import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'evening_snack', 'dinner', 'post_dinner'];

// POST /api/expenses/meals — Create/get meal session
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
    const { expense_date, meal_type } = body;

    if (!expense_date || !meal_type) {
      return NextResponse.json(
        { error: 'expense_date and meal_type are required' },
        { status: 400 }
      );
    }

    if (!VALID_MEAL_TYPES.includes(meal_type)) {
      return NextResponse.json(
        { error: 'Invalid meal type' },
        { status: 400 }
      );
    }

    // Only block future dates
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (expense_date > today) {
      return NextResponse.json({ error: 'Cannot add expenses for future dates' }, { status: 400 });
    }

    // Upsert meal session
    const { data: meal, error } = await supabase
      .from('expense_meals')
      .upsert(
        {
          user_id: userData.id,
          expense_date,
          meal_type,
        },
        { onConflict: 'user_id,expense_date,meal_type' }
      )
      .select('*, expense_meal_items(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(meal);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
