-- ============================================================================
-- Remove 3-day edit window restriction from expense RLS policies
-- ============================================================================
-- Previously, users could only insert/update/delete expenses for dates within
-- the last 2 days (today, yesterday, day before). This migration removes that
-- restriction so users can log expenses for any past date.
-- The API layer still blocks future dates.
-- ============================================================================

-- ============================================================================
-- EXPENSE_MEALS — drop and recreate without date restriction
-- ============================================================================

DROP POLICY IF EXISTS expense_meals_insert_own ON expense_meals;
CREATE POLICY expense_meals_insert_own ON expense_meals
  FOR INSERT WITH CHECK (
    user_id = get_user_id_from_auth()
  );

DROP POLICY IF EXISTS expense_meals_update_own ON expense_meals;
CREATE POLICY expense_meals_update_own ON expense_meals
  FOR UPDATE USING (
    user_id = get_user_id_from_auth()
  );

DROP POLICY IF EXISTS expense_meals_delete_own ON expense_meals;
CREATE POLICY expense_meals_delete_own ON expense_meals
  FOR DELETE USING (
    user_id = get_user_id_from_auth()
  );

-- ============================================================================
-- EXPENSE_MEAL_ITEMS — drop and recreate without date restriction
-- ============================================================================

DROP POLICY IF EXISTS meal_items_insert_own ON expense_meal_items;
CREATE POLICY meal_items_insert_own ON expense_meal_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_meals
      WHERE expense_meals.id = expense_meal_items.meal_id
      AND expense_meals.user_id = get_user_id_from_auth()
    )
  );

DROP POLICY IF EXISTS meal_items_update_own ON expense_meal_items;
CREATE POLICY meal_items_update_own ON expense_meal_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM expense_meals
      WHERE expense_meals.id = expense_meal_items.meal_id
      AND expense_meals.user_id = get_user_id_from_auth()
    )
  );

DROP POLICY IF EXISTS meal_items_delete_own ON expense_meal_items;
CREATE POLICY meal_items_delete_own ON expense_meal_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM expense_meals
      WHERE expense_meals.id = expense_meal_items.meal_id
      AND expense_meals.user_id = get_user_id_from_auth()
    )
  );

-- ============================================================================
-- EXPENSE_OTHERS — drop and recreate without date restriction
-- ============================================================================

DROP POLICY IF EXISTS expense_others_insert_own ON expense_others;
CREATE POLICY expense_others_insert_own ON expense_others
  FOR INSERT WITH CHECK (
    user_id = get_user_id_from_auth()
  );

DROP POLICY IF EXISTS expense_others_update_own ON expense_others;
CREATE POLICY expense_others_update_own ON expense_others
  FOR UPDATE USING (
    user_id = get_user_id_from_auth()
  );

DROP POLICY IF EXISTS expense_others_delete_own ON expense_others;
CREATE POLICY expense_others_delete_own ON expense_others
  FOR DELETE USING (
    user_id = get_user_id_from_auth()
  );
