// ============================================================================
// App-wide constants
// ============================================================================

import type { MealType, ExpenseCategory } from '@/types';

export const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'evening_snack', label: 'Evening Snack', emoji: '🌤️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'post_dinner', label: 'Post Dinner', emoji: '🌜' },
];

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: 'groceries', label: 'Groceries', emoji: '🛒' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { value: 'miscellaneous', label: 'Miscellaneous', emoji: '📦' },
];

export const ALL_BUDGET_CATEGORIES = [
  ...MEAL_TYPES.map(m => m.value),
  'food_total',
  ...EXPENSE_CATEGORIES.map(c => c.value),
] as const;

export const EDIT_WINDOW_DAYS = 2;

export const DEFAULT_SCORE_VALUE = 5;

export const MAX_USERS = 10;

export const CURRENCY_SYMBOL = '₹';

export const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: 'Home' as const },
  { href: '/habits', label: 'Habits', icon: 'CheckSquare' as const },
  { href: '/expenses', label: 'Expenses', icon: 'Wallet' as const },
  { href: '/analytics', label: 'Analytics', icon: 'BarChart3' as const },
  { href: '/profile', label: 'Profile', icon: 'User' as const },
] as const;

export const ADMIN_NAV_ITEM = {
  href: '/admin',
  label: 'Admin',
  icon: 'Settings' as const,
} as const;
