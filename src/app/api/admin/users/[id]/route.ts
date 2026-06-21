import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// PATCH /api/admin/users/[id] — Update user details
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

    const { data: adminUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { display_name, is_active, role } = body;

    const updateData: Record<string, unknown> = {};
    if (display_name !== undefined) updateData.display_name = display_name.trim();
    if (is_active !== undefined) updateData.is_active = is_active;
    if (role !== undefined) updateData.role = role;

    const adminClient = createAdminClient();

    // Get old value for logging
    const { data: oldUser } = await adminClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    const { data: updatedUser, error } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log action
    const action = is_active === false ? 'deactivate_user' :
                   is_active === true ? 'reactivate_user' : 'edit_user';

    await adminClient.from('admin_logs').insert({
      admin_id: adminUser.id,
      action,
      target_user_id: id,
      table_name: 'users',
      record_id: id,
      old_value: oldUser,
      new_value: updateData,
    });

    return NextResponse.json(updatedUser);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] — Deactivate user
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

    const { data: adminUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'deactivate_user',
      target_user_id: id,
      table_name: 'users',
      record_id: id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
