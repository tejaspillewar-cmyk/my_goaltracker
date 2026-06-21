import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// PATCH /api/goals/[id] — Edit goal (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify admin role from DB
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, score_value } = body;

    // If score_value is changing, use the atomic RPC function
    if (score_value !== undefined) {
      const newScore = Number(score_value);
      if (newScore <= 0 || !Number.isInteger(newScore)) {
        return NextResponse.json(
          { error: 'Score value must be a positive integer' },
          { status: 400 }
        );
      }

      const adminClient = createAdminClient();
      const { error: rpcError } = await adminClient.rpc('update_goal_score_value', {
        p_goal_id: id,
        p_new_score: newScore,
        p_admin_id: adminUser.id,
      });

      if (rpcError) {
        return NextResponse.json({ error: rpcError.message }, { status: 500 });
      }
    }

    // If name is changing, update it directly
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Goal name cannot be empty' }, { status: 400 });
      }

      const adminClient = createAdminClient();
      const { error: updateError } = await adminClient
        .from('goals')
        .update({
          name: name.trim(),
          updated_by: adminUser.id,
        })
        .eq('id', id);

      if (updateError) {
        if (updateError.code === '23505') {
          return NextResponse.json(
            { error: 'A goal with this name already exists for this user' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Log name change
      await adminClient.from('admin_logs').insert({
        admin_id: adminUser.id,
        action: 'edit_goal',
        table_name: 'goals',
        record_id: id,
        new_value: { name: name.trim() },
      });
    }

    // Fetch updated goal
    const adminClient = createAdminClient();
    const { data: updatedGoal } = await adminClient
      .from('goals')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json(updatedGoal);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/goals/[id] — Soft-delete goal (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify admin role
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use the atomic RPC function
    const adminClient = createAdminClient();
    const { error: rpcError } = await adminClient.rpc('soft_delete_goal', {
      p_goal_id: id,
      p_admin_id: adminUser.id,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
