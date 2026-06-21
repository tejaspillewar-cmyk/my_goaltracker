-- ============================================================================
-- Life Tracker — Seed Script
-- ============================================================================
-- Run this AFTER creating your admin user in the Supabase Auth dashboard.
--
-- Steps:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → enter admin email + password
-- 3. Copy the user's UUID from the dashboard
-- 4. Replace 'YOUR_ADMIN_AUTH_UUID_HERE' below with that UUID
-- 5. Run this script in the SQL Editor
-- ============================================================================

INSERT INTO users (auth_id, display_name, role, is_active)
VALUES (
  'YOUR_ADMIN_AUTH_UUID_HERE'::UUID,  -- Replace with actual auth.users UUID
  'Admin',                             -- Display name
  'admin',                             -- Role
  TRUE
)
ON CONFLICT (auth_id) DO UPDATE SET
  role = 'admin',
  display_name = EXCLUDED.display_name;
