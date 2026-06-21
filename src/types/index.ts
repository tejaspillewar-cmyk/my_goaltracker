// ============================================================================
// TypeScript type definitions for all entities
// ============================================================================

export type UserRole = 'admin' | 'user';

export type MealType = 'breakfast' | 'lunch' | 'evening_snack' | 'dinner' | 'post_dinner';

export type ExpenseCategory = 'groceries' | 'transport' | 'entertainment' | 'miscellaneous';

export type AdminAction =
  | 'create_user'
  | 'deactivate_user'
  | 'reactivate_user'
  | 'reset_password'
  | 'create_goal'
  | 'edit_goal'
  | 'edit_goal_score'
  | 'delete_goal'
  | 'edit_entry'
  | 'edit_expense';

// ============================================================================
// Database Row Types
// ============================================================================

export interface User {
  id: string;
  auth_id: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  score_value: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface GoalEntry {
  id: string;
  user_id: string;
  goal_id: string;
  entry_date: string;
  is_checked: boolean;
  score_earned: number;
  created_at: string;
  updated_at: string;
}

export interface DailyScore {
  id: string;
  user_id: string;
  score_date: string;
  total_score: number;
  max_possible_score: number;
  performance_pct: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyScore {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_score: number;
  max_possible_score: number;
  performance_pct: number;
  monthly_average: number;
  active_days: number;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardSnapshot {
  id: string;
  year: number;
  month: number;
  user_id: string;
  display_name: string;
  total_score: number;
  max_possible_score: number;
  performance_pct: number;
  rank: number;
  created_at: string;
}

export interface ExpenseMeal {
  id: string;
  user_id: string;
  expense_date: string;
  meal_type: MealType;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseMealItem {
  id: string;
  meal_id: string;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseOther {
  id: string;
  user_id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetLimit {
  id: string;
  user_id: string;
  year: number;
  month: number;
  category: string;
  daily_limit: number | null;
  monthly_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  table_name: string | null;
  record_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

// ============================================================================
// API / UI Types
// ============================================================================

export interface GoalMatrixRow {
  date: string;
  is_locked: boolean;
  entries: Record<string, { is_checked: boolean; entry_id: string | null }>;
  total_score: number;
  max_possible_score: number;
}

export interface ExpenseDaySummary {
  date: string;
  meals: (ExpenseMeal & { expense_meal_items: ExpenseMealItem[] })[];
  others: ExpenseOther[];
  total_meals: number;
  total_others: number;
  grand_total: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  total_score: number;
  max_possible_score: number;
  performance_pct: number;
  active_days?: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total_food: number;
  total_by_meal: Record<MealType, number>;
  total_by_category: Record<ExpenseCategory, number>;
  grand_total: number;
}
