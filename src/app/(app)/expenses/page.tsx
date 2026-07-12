

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { MealCard } from '@/components/expenses/meal-card';
import { BudgetLimitCard } from '@/components/expenses/budget-limit-card';
import { DayTotalCard } from '@/components/expenses/day-total-card';
import { OtherExpenseCard } from '@/components/expenses/other-expense-card';
import { ReportDownload } from '@/components/expenses/report-download';
import { useExpenses } from '@/hooks/use-expenses';
import { useAuth } from '@/hooks/use-auth';
import { getISTToday, formatISTDate, getDayNameFull } from '@/lib/utils/date';
import { MEAL_TYPES, EXPENSE_CATEGORIES } from '@/lib/utils/constants';
import type { ExpenseMeal, ExpenseMealItem, ExpenseOther } from '@/types';

export default function ExpensesPage() {
  const [date, setDate] = useState(getISTToday());
  const { data: expenses, isLoading } = useExpenses(date);
  const { isLoading: authLoading } = useAuth();

  const goToPrevDay = () => {
    const d = new Date(date + 'T00:00:00+05:30');
    d.setDate(d.getDate() - 1);
    setDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  };

  const goToNextDay = () => {
    const today = getISTToday();
    const d = new Date(date + 'T00:00:00+05:30');
    d.setDate(d.getDate() + 1);
    const next = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (next <= today) {
      setDate(next);
    }
  };

  const isToday = date === getISTToday();

  if (authLoading) {
    return (
      <div className="page-content">
        <div className="space-y-4">
          <div className="skeleton h-8 w-48" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-secondary-muted)' }}
          >
            <Wallet className="w-5 h-5" style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Expenses</h1>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              Log your daily spending
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center justify-between glass-card px-4 py-3">
          <button onClick={goToPrevDay} className="btn-ghost btn-icon btn-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold">{formatISTDate(date)}</div>
            <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              {getDayNameFull(date)}
            </div>
          </div>
          <button
            onClick={goToNextDay}
            disabled={isToday}
            className="btn-ghost btn-icon btn-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Total — expandable card with carry-forward + monthly overview */}
        {!isLoading && expenses && (
          <DayTotalCard date={date} dayTotal={expenses.grand_total} />
        )}

        {/* Budget Limit */}
        {!isLoading && expenses && (
          <BudgetLimitCard date={date} totalExpenses={expenses.grand_total} />
        )}

        {/* Meal Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
            Meals
          </h2>
          {MEAL_TYPES.map((mt) => {
            const meal = expenses?.meals?.find(
              (m: ExpenseMeal & { expense_meal_items: ExpenseMealItem[] }) => m.meal_type === mt.value
            );
            return (
              <MealCard
                key={mt.value}
                mealType={mt.value}
                label={mt.label}
                emoji={mt.emoji}
                date={date}
                meal={meal as (ExpenseMeal & { expense_meal_items: ExpenseMealItem[] }) | undefined}
              />
            );
          })}
        </div>

        {/* Report Download */}
        <ReportDownload />

        {/* Other Expenses */}
        {!isLoading && expenses && (
          <div className="space-y-3 pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
              Other Expenses
            </h2>
            {EXPENSE_CATEGORIES.map((cat) => {
              const catExpenses = expenses.others?.filter((e: ExpenseOther) => e.category === cat.value) || [];
              return (
                <OtherExpenseCard
                  key={cat.value}
                  category={cat.value}
                  label={cat.label}
                  emoji={cat.emoji}
                  date={date}
                  expenses={catExpenses}
                />
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
