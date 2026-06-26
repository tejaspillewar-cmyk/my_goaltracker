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

export function BudgetLimitCard({ date, totalExpenses }: BudgetLimitCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [newLimit, setNewLimit] = useState('');

  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  const { data: limits, isLoading } = useBudgetLimits(month, year);
  const updateLimit = useUpdateBudgetLimit();

  const dailyTotalLimitObj = limits?.find((l) => l.category === 'daily_total');
  const dailyLimit = dailyTotalLimitObj?.daily_limit || 0;

  const percentage = dailyLimit > 0 ? Math.min((totalExpenses / dailyLimit) * 100, 100) : 0;
  const isOverBudget = dailyLimit > 0 && totalExpenses > dailyLimit;

  const handleSave = async () => {
    if (!newLimit) return;
    await updateLimit.mutateAsync({
      year,
      month,
      category: 'daily_total',
      daily_limit: Number(newLimit),
    });
    setShowSettings(false);
    setNewLimit('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
          <h3 className="font-semibold text-sm uppercase tracking-wide">Daily Budget</h3>
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
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>
                Set Daily Limit
              </label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="input-field text-sm"
                placeholder={`Current: ${CURRENCY_SYMBOL}${dailyLimit}`}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!newLimit || updateLimit.isPending}
                className="btn-primary btn-sm flex-1"
              >
                {updateLimit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
              </button>
              <button
                onClick={() => setShowSettings(false)}
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
                {/* Progress Bar */}
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
                No daily budget set. Click the settings icon to add one.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
