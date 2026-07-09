'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Loader2, Target } from 'lucide-react';
import { useBudgetLimits, useUpdateBudgetLimit } from '@/hooks/use-budget';
import { CURRENCY_SYMBOL } from '@/lib/utils/constants';

interface BudgetLimitCardProps {
  date: string;
  totalExpenses: number;
}

function isWeekendDate(dateStr: string): boolean {
  const dow = new Date(dateStr + 'T00:00:00+05:30').getDay();
  return dow === 0 || dow === 6;
}

export function BudgetLimitCard({ date, totalExpenses }: BudgetLimitCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [weekdayInput, setWeekdayInput] = useState('');
  const [weekendInput, setWeekendInput] = useState('');

  const dateObj = new Date(date + 'T00:00:00+05:30');
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const isWeekend = isWeekendDate(date);

  const { data: limits, isLoading } = useBudgetLimits(month, year);
  const updateLimit = useUpdateBudgetLimit();

  // Read weekday and weekend limits from DB
  const weekdayLimitObj = limits?.find((l) => l.category === 'daily_total_weekday');
  const weekendLimitObj = limits?.find((l) => l.category === 'daily_total_weekend');
  // Fallback: legacy single 'daily_total' for users who set it before
  const legacyLimitObj  = limits?.find((l) => l.category === 'daily_total');

  const weekdayLimit = weekdayLimitObj?.daily_limit ?? legacyLimitObj?.daily_limit ?? 0;
  const weekendLimit = weekendLimitObj?.daily_limit ?? legacyLimitObj?.daily_limit ?? 0;

  const dailyLimit = isWeekend ? weekendLimit : weekdayLimit;
  const percentage = dailyLimit > 0 ? Math.min((totalExpenses / dailyLimit) * 100, 100) : 0;
  const isOverBudget = dailyLimit > 0 && totalExpenses > dailyLimit;

  const handleSave = async () => {
    const saves: Promise<unknown>[] = [];
    if (weekdayInput) {
      saves.push(updateLimit.mutateAsync({
        year, month,
        category: 'daily_total_weekday',
        daily_limit: Number(weekdayInput),
      }));
    }
    if (weekendInput) {
      saves.push(updateLimit.mutateAsync({
        year, month,
        category: 'daily_total_weekend',
        daily_limit: Number(weekendInput),
      }));
    }
    if (saves.length > 0) {
      await Promise.all(saves);
    }
    setShowSettings(false);
    setWeekdayInput('');
    setWeekendInput('');
  };

  const isSaving = updateLimit.isPending;
  const canSave = (weekdayInput || weekendInput) && !isSaving;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
          <h3 className="font-semibold text-sm uppercase tracking-wide">
            Daily Budget
            <span className="ml-1.5 text-xs font-normal normal-case" style={{ color: 'var(--foreground-subtle)' }}>
              {isWeekend ? 'Weekend' : 'Weekday'}
            </span>
          </h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 rounded-lg transition-colors hover:bg-[var(--card-bg)]"
        >
          <Settings className="w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showSettings ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 mt-2"
          >
            {/* Weekday */}
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>
                Mon–Fri limit
              </label>
              <input
                type="number"
                value={weekdayInput}
                onChange={(e) => setWeekdayInput(e.target.value)}
                className="input-field text-sm"
                placeholder={weekdayLimit ? `Current: ${CURRENCY_SYMBOL}${weekdayLimit}` : `${CURRENCY_SYMBOL}0`}
                min="0"
              />
            </div>
            {/* Weekend */}
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>
                Sat–Sun limit
              </label>
              <input
                type="number"
                value={weekendInput}
                onChange={(e) => setWeekendInput(e.target.value)}
                className="input-field text-sm"
                placeholder={weekendLimit ? `Current: ${CURRENCY_SYMBOL}${weekendLimit}` : `${CURRENCY_SYMBOL}0`}
                min="0"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="btn-primary btn-sm flex-1"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
              </button>
              <button
                onClick={() => { setShowSettings(false); setWeekdayInput(''); setWeekendInput(''); }}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isLoading ? (
              <div className="h-12 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--foreground-muted)' }} />
              </div>
            ) : dailyLimit > 0 ? (
              <div className="space-y-2 mt-2">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold" style={{ color: isOverBudget ? 'var(--danger)' : 'var(--foreground)' }}>
                    {CURRENCY_SYMBOL}{totalExpenses.toFixed(0)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
                    / {CURRENCY_SYMBOL}{dailyLimit}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: isOverBudget ? 'var(--danger)' : 'var(--accent-secondary)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                No daily budget set. Tap the settings icon to add one.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
