import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/expenses/meals/[mealId]/items — Add item to meal
export async function POST(
  request: Request,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const { mealId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (amount === undefined || Number(amount) < 0) {
      return NextResponse.json({ error: 'Amount must be non-negative' }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from('expense_meal_items')
      .insert({
        meal_id: mealId,
        description: description.trim(),
        amount: Number(amount),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/expenses/meals/[mealId]/items — Update item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    await params; // consume params
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { item_id, description, amount } = body;

    if (!item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (description !== undefined) updateData.description = description.trim();
    if (amount !== undefined) {
      if (Number(amount) < 0) {
        return NextResponse.json({ error: 'Amount must be non-negative' }, { status: 400 });
      }
      updateData.amount = Number(amount);
    }

    const { data: item, error } = await supabase
      .from('expense_meal_items')
      .update(updateData)
      .eq('id', item_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/expenses/meals/[mealId]/items — Remove item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('expense_meal_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
