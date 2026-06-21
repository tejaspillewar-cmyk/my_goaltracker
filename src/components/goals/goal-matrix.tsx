'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGoalMatrix, useToggleEntry } from '@/hooks/use-goals';
import { isWithinEditWindow, formatDateShort, getDayName, getISTMonthYear, formatMonthYear } from '@/lib/utils/date';
import { useAuth } from '@/hooks/use-auth';
import type { Goal, GoalEntry } from '@/types';

export function GoalMatrix() {
  const { isAdmin } = useAuth();
  const { year: currentYear, month: currentMonth } = getISTMonthYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const { data, isLoading } = useGoalMatrix(month, year);
  const toggleEntry = useToggleEntry();

  const goals = data?.goals || [];
  const entries = data?.entries || [];

  // Build a lookup: { "YYYY-MM-DD": { "goal_id": GoalEntry } }
  const entryMap = new Map<string, Map<string, GoalEntry>>();
  entries.forEach((entry) => {
    if (!entryMap.has(entry.entry_date)) {
      entryMap.set(entry.entry_date, new Map());
    }
    entryMap.get(entry.entry_date)!.set(entry.goal_id, entry);
  });

  // Get all unique dates from entries, sorted descending (newest first)
  const daysInMonth = new Date(year, month, 0).getDate();
  const allDates: string[] = [];
  for (let d = daysInMonth; d >= 1; d--) {
    allDates.push(
      `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    );
  }

  const handleToggle = (goalId: string, date: string, currentlyChecked: boolean) => {
    toggleEntry.mutate({
      goal_id: goalId,
      entry_date: date,
      is_checked: !currentlyChecked,
    });
  };

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const isCurrentMonth = year === currentYear && month === currentMonth;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h3 className="text-lg font-semibold mb-1">No Goals Yet</h3>
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Add your first goal to start tracking your habits!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <button onClick={goToPrevMonth} className="btn-ghost btn-icon">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">{formatMonthYear(year, month)}</h2>
        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className="btn-ghost btn-icon"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Matrix Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: `${120 + goals.length * 60}px` }}>
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-10 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{
                    background: 'var(--background-secondary)',
                    color: 'var(--foreground-muted)',
                    borderBottom: '1px solid var(--card-border)',
                  }}
                >
                  Date
                </th>
                {goals.map((goal) => (
                  <th
                    key={goal.id}
                    className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider"
                    style={{
                      color: 'var(--foreground-muted)',
                      borderBottom: '1px solid var(--card-border)',
                      minWidth: '56px',
                    }}
                  >
                    <div className="truncate max-w-[56px]" title={goal.name}>
                      {goal.name}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--accent-primary)' }}>
                      +{goal.score_value}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {allDates.map((date, rowIdx) => {
                  const editable = isAdmin || isWithinEditWindow(date);
                  const dateEntries = entryMap.get(date);

                  // Don't show future dates
                  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                  if (date > today) return null;

                  return (
                    <motion.tr
                      key={date}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: rowIdx * 0.02 }}
                      style={{
                        background: editable ? 'transparent' : 'rgba(39, 39, 42, 0.3)',
                        borderBottom: '1px solid var(--card-border)',
                      }}
                    >
                      <td
                        className="sticky left-0 z-10 px-3 py-2.5"
                        style={{
                          background: editable
                            ? 'var(--background-secondary)'
                            : 'rgba(30, 30, 34, 0.95)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {!editable && (
                            <Lock className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--foreground-subtle)' }} />
                          )}
                          <div>
                            <div className="text-sm font-medium">{formatDateShort(date)}</div>
                            <div className="text-[10px]" style={{ color: 'var(--foreground-subtle)' }}>
                              {getDayName(date)}
                            </div>
                          </div>
                        </div>
                      </td>
                      {goals.map((goal) => {
                        const entry = dateEntries?.get(goal.id);
                        const isChecked = entry?.is_checked || false;
                        // Only show for goals that existed on this date
                        const goalExisted = new Date(goal.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) <= date;

                        if (!goalExisted) {
                          return (
                            <td key={goal.id} className="px-2 py-2.5 text-center">
                              <div className="w-7 h-7 mx-auto rounded-lg opacity-10"
                                   style={{ background: 'var(--input-bg)' }} />
                            </td>
                          );
                        }

                        return (
                          <td key={goal.id} className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => editable && handleToggle(goal.id, date, isChecked)}
                              disabled={!editable || toggleEntry.isPending}
                              className={`goal-checkbox mx-auto ${isChecked ? 'checked' : ''} ${!editable ? 'locked' : ''}`}
                              aria-label={`${goal.name} on ${date}: ${isChecked ? 'checked' : 'unchecked'}`}
                            >
                              {isChecked && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                >
                                  <Check className="w-4 h-4 text-black" strokeWidth={3} />
                                </motion.div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
