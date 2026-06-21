-- ============================================================================
-- Life Tracker — Initial Database Schema
-- ============================================================================
-- All 10 tables as defined in the specification.
-- Run this migration first in your Supabase SQL Editor.
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Table: users
-- Mirrors Supabase auth.users. auth_id links to the auth layer.
-- ============================================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       UUID UNIQUE NOT NULL,  -- Supabase auth.users id
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- Table: goals
-- One row per goal per user. Soft-deleted via is_active. Score always positive.
-- ============================================================================
CREATE TABLE goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  score_value  INTEGER NOT NULL DEFAULT 5 CHECK (score_value > 0),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID REFERENCES users(id),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_by   UUID REFERENCES users(id),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_active ON goals(user_id, is_active);

-- ============================================================================
-- Table: goal_entries
-- One row per (user, goal, date). score_earned captures the value at check time.
-- ============================================================================
CREATE TABLE goal_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id       UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  entry_date    DATE NOT NULL,
  is_checked    BOOLEAN NOT NULL DEFAULT FALSE,
  score_earned  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id, entry_date)
);

CREATE INDEX idx_goal_entries_user_date ON goal_entries(user_id, entry_date);
CREATE INDEX idx_goal_entries_goal_id ON goal_entries(goal_id);

-- ============================================================================
-- Table: daily_scores
-- Cached daily aggregate. Recomputed whenever goal_entries change.
-- ============================================================================
CREATE TABLE daily_scores (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score_date         DATE NOT NULL,
  total_score        INTEGER NOT NULL DEFAULT 0,
  max_possible_score INTEGER NOT NULL DEFAULT 0,
  performance_pct    DECIMAL(5, 2) DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, score_date)
);

CREATE INDEX idx_daily_scores_user_date ON daily_scores(user_id, score_date);

-- ============================================================================
-- Table: monthly_scores
-- Monthly aggregation of daily scores.
-- ============================================================================
CREATE TABLE monthly_scores (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year               INTEGER NOT NULL,
  month              INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_score        INTEGER NOT NULL DEFAULT 0,
  max_possible_score INTEGER NOT NULL DEFAULT 0,
  performance_pct    DECIMAL(5, 2) DEFAULT 0,
  monthly_average    DECIMAL(5, 2) DEFAULT 0,
  active_days        INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

CREATE INDEX idx_monthly_scores_period ON monthly_scores(year, month);

-- ============================================================================
-- Table: leaderboard_snapshots
-- Frozen rankings at the end of each month.
-- ============================================================================
CREATE TABLE leaderboard_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year               INTEGER NOT NULL,
  month              INTEGER NOT NULL,
  user_id            UUID NOT NULL REFERENCES users(id),
  display_name       TEXT NOT NULL,
  total_score        INTEGER DEFAULT 0,
  max_possible_score INTEGER DEFAULT 0,
  performance_pct    DECIMAL(5, 2) DEFAULT 0,
  rank               INTEGER NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, user_id)
);

CREATE INDEX idx_leaderboard_period ON leaderboard_snapshots(year, month);

-- ============================================================================
-- Table: expense_meals
-- One row per (user, date, meal_type).
-- ============================================================================
CREATE TABLE expense_meals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  meal_type    TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','evening_snack','dinner','post_dinner')),
  total_cost   DECIMAL(10, 2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, expense_date, meal_type)
);

CREATE INDEX idx_expense_meals_user_date ON expense_meals(user_id, expense_date);

-- ============================================================================
-- Table: expense_meal_items
-- Multiple items per meal. Meal total = SUM of item amounts.
-- ============================================================================
CREATE TABLE expense_meal_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id     UUID NOT NULL REFERENCES expense_meals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_items_meal_id ON expense_meal_items(meal_id);

-- ============================================================================
-- Table: expense_others
-- Non-meal category expenses.
-- ============================================================================
CREATE TABLE expense_others (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('groceries','transport','entertainment','miscellaneous')),
  description  TEXT,
  amount       DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_others_user_date ON expense_others(user_id, expense_date);
CREATE INDEX idx_expense_others_category ON expense_others(user_id, category);

-- ============================================================================
-- Table: budget_limits
-- Per user, per month, per category budget limits.
-- ============================================================================
CREATE TABLE budget_limits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year           INTEGER NOT NULL,
  month          INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  category       TEXT NOT NULL,
  daily_limit    DECIMAL(10, 2),
  monthly_limit  DECIMAL(10, 2),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month, category)
);

CREATE INDEX idx_budget_limits_user_period ON budget_limits(user_id, year, month);

-- ============================================================================
-- Table: admin_logs
-- Every admin action must create a log entry. Non-negotiable.
-- ============================================================================
CREATE TABLE admin_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES users(id),
  action          TEXT NOT NULL,
  target_user_id  UUID REFERENCES users(id),
  table_name      TEXT,
  record_id       UUID,
  old_value       JSONB,
  new_value       JSONB,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_user_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_created ON admin_logs(created_at DESC);

-- ============================================================================
-- Helper function: get user's internal ID from auth ID
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Helper function: check if current user is admin
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
    AND role = 'admin'
    AND is_active = TRUE
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Trigger: auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_goal_entries_updated_at BEFORE UPDATE ON goal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_daily_scores_updated_at BEFORE UPDATE ON daily_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_monthly_scores_updated_at BEFORE UPDATE ON monthly_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_expense_meals_updated_at BEFORE UPDATE ON expense_meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_expense_meal_items_updated_at BEFORE UPDATE ON expense_meal_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_expense_others_updated_at BEFORE UPDATE ON expense_others
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_budget_limits_updated_at BEFORE UPDATE ON budget_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Trigger: auto-recalculate meal total_cost when items change
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_meal_total()
RETURNS TRIGGER AS $$
DECLARE
  v_meal_id UUID;
BEGIN
  -- Get the meal_id from either the new or old row
  IF TG_OP = 'DELETE' THEN
    v_meal_id := OLD.meal_id;
  ELSE
    v_meal_id := NEW.meal_id;
  END IF;

  UPDATE expense_meals
  SET total_cost = COALESCE(
    (SELECT SUM(amount) FROM expense_meal_items WHERE meal_id = v_meal_id),
    0
  )
  WHERE id = v_meal_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_meal_items_total
  AFTER INSERT OR UPDATE OR DELETE ON expense_meal_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_meal_total();
