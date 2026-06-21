-- ============================================================================
-- Life Tracker — Row Level Security Policies
-- ============================================================================
-- Enforces all permission rules at the database level.
-- RLS is the primary enforcement layer — frontend checks are UX only.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_others ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS table policies
-- ============================================================================

-- Users can read their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth_id = auth.uid());

-- Admin can read all users
CREATE POLICY users_select_admin ON users
  FOR SELECT USING (is_admin());

-- Admin can insert users (create accounts)
CREATE POLICY users_insert_admin ON users
  FOR INSERT WITH CHECK (is_admin());

-- Admin can update any user
CREATE POLICY users_update_admin ON users
  FOR UPDATE USING (is_admin());

-- Users can update their own profile (display_name only, enforced in API)
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- ============================================================================
-- GOALS table policies
-- ============================================================================

-- Users can read their own goals
CREATE POLICY goals_select_own ON goals
  FOR SELECT USING (user_id = get_user_id_from_auth());

-- Admin can read all goals
CREATE POLICY goals_select_admin ON goals
  FOR SELECT USING (is_admin());

-- Users can insert their own goals
CREATE POLICY goals_insert_own ON goals
  FOR INSERT WITH CHECK (user_id = get_user_id_from_auth());

-- Admin can insert goals for any user
CREATE POLICY goals_insert_admin ON goals
  FOR INSERT WITH CHECK (is_admin());

-- Admin can update any goal
CREATE POLICY goals_update_admin ON goals
  FOR UPDATE USING (is_admin());

-- Admin can delete any goal (for cascade operations via RPC)
CREATE POLICY goals_delete_admin ON goals
  FOR DELETE USING (is_admin());

-- ============================================================================
-- GOAL_ENTRIES table policies
-- ============================================================================

-- Users can read their own entries
CREATE POLICY goal_entries_select_own ON goal_entries
  FOR SELECT USING (user_id = get_user_id_from_auth());

-- Admin can read all entries
CREATE POLICY goal_entries_select_admin ON goal_entries
  FOR SELECT USING (is_admin());

-- Users can insert their own entries within the 3-day edit window
CREATE POLICY goal_entries_insert_own ON goal_entries
  FOR INSERT WITH CHECK (
    user_id = get_user_id_from_auth()
    AND entry_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
  );

-- Admin can insert entries for any user, any date
CREATE POLICY goal_entries_insert_admin ON goal_entries
  FOR INSERT WITH CHECK (is_admin());

-- Users can update their own entries within the 3-day edit window
CREATE POLICY goal_entries_update_own ON goal_entries
  FOR UPDATE USING (
    user_id = get_user_id_from_auth()
    AND entry_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
  );

-- Admin can update any entry, any date
CREATE POLICY goal_entries_update_admin ON goal_entries
  FOR UPDATE USING (is_admin());

-- Admin can delete entries (for goal deletion cascades via RPC)
CREATE POLICY goal_entries_delete_admin ON goal_entries
  FOR DELETE USING (is_admin());

-- ============================================================================
-- DAILY_SCORES table policies
-- ============================================================================

-- Users can read their own daily scores
CREATE POLICY daily_scores_select_own ON daily_scores
  FOR SELECT USING (user_id = get_user_id_from_auth());

-- Admin can read all daily scores
CREATE POLICY daily_scores_select_admin ON daily_scores
  FOR SELECT USING (is_admin());

-- Users can insert/update their own daily scores (via RPC functions)
CREATE POLICY daily_scores_insert_own ON daily_scores
  FOR INSERT WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY daily_scores_update_own ON daily_scores
  FOR UPDATE USING (user_id = get_user_id_from_auth());

-- Admin can manage all daily scores
CREATE POLICY daily_scores_insert_admin ON daily_scores
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY daily_scores_update_admin ON daily_scores
  FOR UPDATE USING (is_admin());

CREATE POLICY daily_scores_delete_admin ON daily_scores
  FOR DELETE USING (is_admin());

-- ============================================================================
-- MONTHLY_SCORES table policies
-- ============================================================================

-- Users can read their own monthly scores
CREATE POLICY monthly_scores_select_own ON monthly_scores
  FOR SELECT USING (user_id = get_user_id_from_auth());

-- Admin can read all monthly scores
CREATE POLICY monthly_scores_select_admin ON monthly_scores
  FOR SELECT USING (is_admin());

-- Users can insert/update their own monthly scores
CREATE POLICY monthly_scores_insert_own ON monthly_scores
  FOR INSERT WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY monthly_scores_update_own ON monthly_scores
  FOR UPDATE USING (user_id = get_user_id_from_auth());

-- Admin can manage all monthly scores
CREATE POLICY monthly_scores_insert_admin ON monthly_scores
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY monthly_scores_update_admin ON monthly_scores
  FOR UPDATE USING (is_admin());

CREATE POLICY monthly_scores_delete_admin ON monthly_scores
  FOR DELETE USING (is_admin());

-- ============================================================================
-- LEADERBOARD_SNAPSHOTS table policies
-- ============================================================================

-- All authenticated users can read leaderboard snapshots
CREATE POLICY leaderboard_select_all ON leaderboard_snapshots
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only server (service role) inserts snapshots — done via SECURITY DEFINER functions
-- No insert/update/delete policies for regular users

-- ============================================================================
-- EXPENSE_MEALS table policies
-- ============================================================================

-- Users can read their own expense meals
CREATE POLICY expense_meals_select_own ON expense_meals
  FOR SELECT USING (user_id = get_user_id_from_auth());

-- Admin can read all expense meals
CREATE POLICY expense_meals_select_admin ON expense_meals
  FOR SELECT USING (is_admin());

-- Users can insert their own meals within 3-day window
CREATE POLICY expense_meals_insert_own ON expense_meals
  FOR INSERT WITH CHECK (
    user_id = get_user_id_from_auth()
    AND expense_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
  );

-- Admin can insert for any user, any date
CREATE POLICY expense_meals_insert_admin ON expense_meals
  FOR INSERT WITH CHECK (is_admin());

-- Users can update their own meals within 3-day window
CREATE POLICY expense_meals_update_own ON expense_meals
  FOR UPDATE USING (
    user_id = get_user_id_from_auth()
    AND expense_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
  );

-- Admin can update any meal
CREATE POLICY expense_meals_update_admin ON expense_meals
  FOR UPDATE USING (is_admin());

-- Users can delete their own meals within 3-day window
CREATE POLICY expense_meals_delete_own ON expense_meals
  FOR DELETE USING (
    user_id = get_user_id_from_auth()
    AND expense_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
  );

-- Admin can delete any meal
CREATE POLICY expense_meals_delete_admin ON expense_meals
  FOR DELETE USING (is_admin());

-- ============================================================================
-- EXPENSE_MEAL_ITEMS table policies
-- ============================================================================

-- Users can read items for their own meals
CREATE POLICY meal_items_select_own ON expense_meal_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expense_meals
      WHERE expense_meals.id = expense_meal_items.meal_id
      AND expense_meals.user_id = get_user_id_from_auth()
    )
  );

-- Admin can read all meal items
CREATE POLICY meal_items_select_admin ON expense_meal_items
  FOR SELECT USING (is_admin());

-- Users can insert items for their own meals within 3-day window
CREATE POLICY meal_items_insert_own ON expense_meal_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_meals
      WHERE expense_meals.id = expense_meal_items.meal_id
      AND expense_meals.user_id = get_user_id_from_auth()
      AND expense_meals.expense_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
    )
  );

-- Admin can insert items for any meal
CREATE POLICY meal_items_insert_admin ON expense_meal_items
  FOR INSERT WITH CHECK (is_admin());

-- Users can update items for their own meals within 3-day window
CREATE POLICY meal_items_update_own ON expense_meal_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM expense_meals
      WHERE expense_meals.id = expense_meal_items.meal_id
      AND expense_meals.user_id = get_user_id_from_auth()
      AND expense_meals.expense_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
    )
  );

-- Admin can update any meal item
CREATE POLICY meal_items_update_admin ON expense_meal_items
  FOR UPDATE USING (is_admin());

-- Users can delete items from their own meals within 3-day window
CREATE POLICY meal_items_delete_own ON expense_meal_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM expense_meals
      WHERE expense_meals.id = expense_meal_items.meal_id
      AND expense_meals.user_id = get_user_id_from_auth()
      AND expense_meals.expense_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
    )
  );

-- Admin can delete any meal item
CREATE POLICY meal_items_delete_admin ON expense_meal_items
  FOR DELETE USING (is_admin());

-- ============================================================================
-- EXPENSE_OTHERS table policies
-- ============================================================================

-- Users can read their own other expenses
CREATE POLICY expense_others_select_own ON expense_others
  FOR SELECT USING (user_id = get_user_id_from_auth());

-- Admin can read all other expenses
CREATE POLICY expense_others_select_admin ON expense_others
  FOR SELECT USING (is_admin());

-- Users can insert their own other expenses within 3-day window
CREATE POLICY expense_others_insert_own ON expense_others
  FOR INSERT WITH CHECK (
    user_id = get_user_id_from_auth()
    AND expense_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
  );

CREATE POLICY expense_others_insert_admin ON expense_others
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY expense_others_update_own ON expense_others
  FOR UPDATE USING (
    user_id = get_user_id_from_auth()
    AND expense_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
  );

CREATE POLICY expense_others_update_admin ON expense_others
  FOR UPDATE USING (is_admin());

CREATE POLICY expense_others_delete_own ON expense_others
  FOR DELETE USING (
    user_id = get_user_id_from_auth()
    AND expense_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '2 days'
  );

CREATE POLICY expense_others_delete_admin ON expense_others
  FOR DELETE USING (is_admin());

-- ============================================================================
-- BUDGET_LIMITS table policies
-- ============================================================================

-- Users can read their own budget limits
CREATE POLICY budget_limits_select_own ON budget_limits
  FOR SELECT USING (user_id = get_user_id_from_auth());

-- Admin can read all budget limits
CREATE POLICY budget_limits_select_admin ON budget_limits
  FOR SELECT USING (is_admin());

-- Users can insert/update their own budget limits
CREATE POLICY budget_limits_insert_own ON budget_limits
  FOR INSERT WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY budget_limits_update_own ON budget_limits
  FOR UPDATE USING (user_id = get_user_id_from_auth());

-- Admin can manage all budget limits
CREATE POLICY budget_limits_insert_admin ON budget_limits
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY budget_limits_update_admin ON budget_limits
  FOR UPDATE USING (is_admin());

CREATE POLICY budget_limits_delete_admin ON budget_limits
  FOR DELETE USING (is_admin());

-- ============================================================================
-- ADMIN_LOGS table policies
-- ============================================================================

-- Admin can read logs
CREATE POLICY admin_logs_select_admin ON admin_logs
  FOR SELECT USING (is_admin());

-- Server-only insert (via service role or SECURITY DEFINER functions)
-- No insert policy for regular users — logs are created by RPC functions
-- No UPDATE or DELETE policies — logs are immutable
