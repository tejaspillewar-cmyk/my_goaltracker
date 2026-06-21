-- ============================================================================
-- Life Tracker — PostgreSQL Functions for Score Recalculation
-- ============================================================================
-- All score recalculation happens server-side via these functions.
-- Called via Supabase RPC. All are SECURITY DEFINER to bypass RLS.
-- ============================================================================

-- ============================================================================
-- Function: recalculate_daily_score
-- Recomputes daily_scores for a specific user + date from goal_entries.
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_daily_score(
  p_user_id UUID,
  p_date DATE
)
RETURNS void AS $$
DECLARE
  v_total_score INTEGER;
  v_max_score INTEGER;
  v_pct DECIMAL(5, 2);
BEGIN
  -- Calculate total score from checked entries for this date
  SELECT COALESCE(SUM(ge.score_earned), 0)
  INTO v_total_score
  FROM goal_entries ge
  JOIN goals g ON g.id = ge.goal_id
  WHERE ge.user_id = p_user_id
    AND ge.entry_date = p_date
    AND ge.is_checked = TRUE
    AND g.is_active = TRUE;

  -- Calculate max possible score from all active goals that existed on this date
  SELECT COALESCE(SUM(g.score_value), 0)
  INTO v_max_score
  FROM goals g
  WHERE g.user_id = p_user_id
    AND g.is_active = TRUE
    AND g.created_at::date <= p_date;

  -- Calculate performance percentage (avoid division by zero)
  IF v_max_score > 0 THEN
    v_pct := ROUND((v_total_score::DECIMAL / v_max_score) * 100, 2);
  ELSE
    v_pct := 0;
  END IF;

  -- Upsert daily_scores
  INSERT INTO daily_scores (user_id, score_date, total_score, max_possible_score, performance_pct)
  VALUES (p_user_id, p_date, v_total_score, v_max_score, v_pct)
  ON CONFLICT (user_id, score_date)
  DO UPDATE SET
    total_score = v_total_score,
    max_possible_score = v_max_score,
    performance_pct = v_pct,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: recalculate_monthly_score
-- Recomputes monthly_scores from daily_scores for a given user + month.
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_monthly_score(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS void AS $$
DECLARE
  v_total_score INTEGER;
  v_max_score INTEGER;
  v_pct DECIMAL(5, 2);
  v_avg DECIMAL(5, 2);
  v_active_days INTEGER;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calculate month boundaries
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::date;

  -- Sum all daily scores in the month
  SELECT
    COALESCE(SUM(total_score), 0),
    COALESCE(SUM(max_possible_score), 0),
    COUNT(*) FILTER (WHERE total_score > 0)
  INTO v_total_score, v_max_score, v_active_days
  FROM daily_scores
  WHERE user_id = p_user_id
    AND score_date >= v_start_date
    AND score_date <= v_end_date;

  -- Calculate performance percentage
  IF v_max_score > 0 THEN
    v_pct := ROUND((v_total_score::DECIMAL / v_max_score) * 100, 2);
  ELSE
    v_pct := 0;
  END IF;

  -- Calculate monthly average (score per active day)
  IF v_active_days > 0 THEN
    v_avg := ROUND(v_total_score::DECIMAL / v_active_days, 2);
  ELSE
    v_avg := 0;
  END IF;

  -- Upsert monthly_scores
  INSERT INTO monthly_scores (
    user_id, year, month, total_score, max_possible_score,
    performance_pct, monthly_average, active_days
  )
  VALUES (
    p_user_id, p_year, p_month, v_total_score, v_max_score,
    v_pct, v_avg, v_active_days
  )
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    total_score = v_total_score,
    max_possible_score = v_max_score,
    performance_pct = v_pct,
    monthly_average = v_avg,
    active_days = v_active_days,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: recalculate_scores_for_user_month
-- Wrapper: recalculates all daily scores in a month, then monthly aggregate.
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_scores_for_user_month(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS void AS $$
DECLARE
  v_date DATE;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::date;

  -- Recalculate each day in the month that has entries
  FOR v_date IN
    SELECT DISTINCT entry_date
    FROM goal_entries
    WHERE user_id = p_user_id
      AND entry_date >= v_start_date
      AND entry_date <= v_end_date
  LOOP
    PERFORM recalculate_daily_score(p_user_id, v_date);
  END LOOP;

  -- Also recalculate days that might have had entries deleted
  -- by checking daily_scores that exist but no longer have entries
  FOR v_date IN
    SELECT score_date
    FROM daily_scores
    WHERE user_id = p_user_id
      AND score_date >= v_start_date
      AND score_date <= v_end_date
      AND score_date NOT IN (
        SELECT DISTINCT entry_date
        FROM goal_entries
        WHERE user_id = p_user_id
          AND entry_date >= v_start_date
          AND entry_date <= v_end_date
      )
  LOOP
    -- These dates had all entries removed; reset their scores
    UPDATE daily_scores
    SET total_score = 0, max_possible_score = 0, performance_pct = 0
    WHERE user_id = p_user_id AND score_date = v_date;
  END LOOP;

  -- Recalculate monthly aggregate
  PERFORM recalculate_monthly_score(p_user_id, p_year, p_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: soft_delete_goal
-- Atomic: deactivates goal, deletes all entries, recalculates all scores, logs action.
-- ============================================================================
CREATE OR REPLACE FUNCTION soft_delete_goal(
  p_goal_id UUID,
  p_admin_id UUID
)
RETURNS void AS $$
DECLARE
  v_goal RECORD;
  v_affected_months RECORD;
  v_old_value JSONB;
BEGIN
  -- Get goal details before deletion
  SELECT * INTO v_goal FROM goals WHERE id = p_goal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found: %', p_goal_id;
  END IF;

  -- Snapshot old value for logging
  v_old_value := jsonb_build_object(
    'id', v_goal.id,
    'name', v_goal.name,
    'score_value', v_goal.score_value,
    'user_id', v_goal.user_id,
    'is_active', v_goal.is_active
  );

  -- 1. Set is_active = false (soft delete)
  UPDATE goals SET is_active = FALSE, updated_by = p_admin_id WHERE id = p_goal_id;

  -- 2. Get all affected months before deleting entries
  -- (we need to recalculate these months after deletion)
  CREATE TEMP TABLE IF NOT EXISTS temp_affected_months (year INTEGER, month INTEGER);
  TRUNCATE temp_affected_months;

  INSERT INTO temp_affected_months (year, month)
  SELECT DISTINCT
    EXTRACT(YEAR FROM entry_date)::INTEGER,
    EXTRACT(MONTH FROM entry_date)::INTEGER
  FROM goal_entries
  WHERE goal_id = p_goal_id;

  -- 3. Delete ALL goal_entries for this goal
  DELETE FROM goal_entries WHERE goal_id = p_goal_id;

  -- 4. Recalculate scores for all affected months
  FOR v_affected_months IN SELECT * FROM temp_affected_months
  LOOP
    PERFORM recalculate_scores_for_user_month(
      v_goal.user_id,
      v_affected_months.year,
      v_affected_months.month
    );
  END LOOP;

  DROP TABLE IF EXISTS temp_affected_months;

  -- 5. Log the action
  INSERT INTO admin_logs (admin_id, action, target_user_id, table_name, record_id, old_value, new_value)
  VALUES (
    p_admin_id,
    'delete_goal',
    v_goal.user_id,
    'goals',
    p_goal_id,
    v_old_value,
    jsonb_build_object('is_active', FALSE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: update_goal_score_value
-- Atomic: updates score, updates all entries, recalculates all scores, logs.
-- ============================================================================
CREATE OR REPLACE FUNCTION update_goal_score_value(
  p_goal_id UUID,
  p_new_score INTEGER,
  p_admin_id UUID
)
RETURNS void AS $$
DECLARE
  v_goal RECORD;
  v_old_score INTEGER;
  v_affected_months RECORD;
BEGIN
  -- Validate score
  IF p_new_score <= 0 THEN
    RAISE EXCEPTION 'Score value must be positive, got: %', p_new_score;
  END IF;

  -- Get current goal
  SELECT * INTO v_goal FROM goals WHERE id = p_goal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found: %', p_goal_id;
  END IF;

  v_old_score := v_goal.score_value;

  -- 1. Update the score_value in goals table
  UPDATE goals
  SET score_value = p_new_score, updated_by = p_admin_id
  WHERE id = p_goal_id;

  -- 2. Update score_earned in ALL checked entries for this goal
  UPDATE goal_entries
  SET score_earned = p_new_score
  WHERE goal_id = p_goal_id AND is_checked = TRUE;

  -- 3. Get all affected months
  CREATE TEMP TABLE IF NOT EXISTS temp_affected_months_score (year INTEGER, month INTEGER);
  TRUNCATE temp_affected_months_score;

  INSERT INTO temp_affected_months_score (year, month)
  SELECT DISTINCT
    EXTRACT(YEAR FROM entry_date)::INTEGER,
    EXTRACT(MONTH FROM entry_date)::INTEGER
  FROM goal_entries
  WHERE goal_id = p_goal_id;

  -- 4. Recalculate scores for all affected months
  FOR v_affected_months IN SELECT * FROM temp_affected_months_score
  LOOP
    PERFORM recalculate_scores_for_user_month(
      v_goal.user_id,
      v_affected_months.year,
      v_affected_months.month
    );
  END LOOP;

  DROP TABLE IF EXISTS temp_affected_months_score;

  -- 5. Log the action
  INSERT INTO admin_logs (admin_id, action, target_user_id, table_name, record_id, old_value, new_value)
  VALUES (
    p_admin_id,
    'edit_goal_score',
    v_goal.user_id,
    'goals',
    p_goal_id,
    jsonb_build_object('score_value', v_old_score),
    jsonb_build_object('score_value', p_new_score)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: snapshot_leaderboard
-- Copies monthly_scores into leaderboard_snapshots with ranking.
-- Called by Vercel cron at midnight IST on the 1st of each month.
-- ============================================================================
CREATE OR REPLACE FUNCTION snapshot_leaderboard(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS void AS $$
BEGIN
  -- Delete existing snapshot for this month (idempotent)
  DELETE FROM leaderboard_snapshots
  WHERE year = p_year AND month = p_month;

  -- Insert ranked snapshot
  INSERT INTO leaderboard_snapshots (
    year, month, user_id, display_name,
    total_score, max_possible_score, performance_pct, rank
  )
  SELECT
    p_year,
    p_month,
    ms.user_id,
    u.display_name,
    ms.total_score,
    ms.max_possible_score,
    ms.performance_pct,
    ROW_NUMBER() OVER (
      ORDER BY
        ms.performance_pct DESC,           -- Primary: performance %
        ms.total_score DESC,               -- Tie-break 1: higher raw score
        ms.active_days DESC,               -- Tie-break 2: more check-ins
        u.display_name ASC                 -- Tie-break 3: alphabetical
    )::INTEGER AS rank
  FROM monthly_scores ms
  JOIN users u ON u.id = ms.user_id
  WHERE ms.year = p_year
    AND ms.month = p_month
    AND u.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: upsert_goal_entry
-- Toggles a goal entry and recalculates scores atomically.
-- Used by the API when a user checks/unchecks a goal.
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_goal_entry(
  p_user_id UUID,
  p_goal_id UUID,
  p_entry_date DATE,
  p_is_checked BOOLEAN
)
RETURNS void AS $$
DECLARE
  v_score_value INTEGER;
  v_score_earned INTEGER;
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  -- Get the goal's current score value
  SELECT score_value INTO v_score_value
  FROM goals
  WHERE id = p_goal_id AND user_id = p_user_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found or inactive: %', p_goal_id;
  END IF;

  -- Calculate score earned
  IF p_is_checked THEN
    v_score_earned := v_score_value;
  ELSE
    v_score_earned := 0;
  END IF;

  -- Upsert the entry
  INSERT INTO goal_entries (user_id, goal_id, entry_date, is_checked, score_earned)
  VALUES (p_user_id, p_goal_id, p_entry_date, p_is_checked, v_score_earned)
  ON CONFLICT (user_id, goal_id, entry_date)
  DO UPDATE SET
    is_checked = p_is_checked,
    score_earned = v_score_earned,
    updated_at = NOW();

  -- Recalculate daily score
  PERFORM recalculate_daily_score(p_user_id, p_entry_date);

  -- Recalculate monthly score
  v_year := EXTRACT(YEAR FROM p_entry_date)::INTEGER;
  v_month := EXTRACT(MONTH FROM p_entry_date)::INTEGER;
  PERFORM recalculate_monthly_score(p_user_id, v_year, v_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
