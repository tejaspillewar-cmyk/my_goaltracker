import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/budget?month=MM&year=YYYY — Get budget limits
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get('month'));
    const year = Number(searchParams.get('year'));

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
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

    const { data: limits, error } = await supabase
      .from('budget_limits')
      .select('*')
      .eq('user_id', userData.id)
      .eq('year', year)
      .eq('month', month);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(limits || []);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/budget — Set/update budget limits
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { year, month, category, daily_limit, monthly_limit } = body;

    if (!year || !month || !category) {
      return NextResponse.json(
        { error: 'year, month, and category are required' },
        { status: 400 }
      );
    }

    const { data: limit, error } = await supabase
      .from('budget_limits')
      .upsert(
        {
          user_id: userData.id,
          year,
          month,
          category,
          daily_limit: daily_limit ?? null,
          monthly_limit: monthly_limit ?? null,
        },
        { onConflict: 'user_id,year,month,category' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(limit);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
