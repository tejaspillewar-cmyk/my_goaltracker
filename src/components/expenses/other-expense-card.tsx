'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useAddOtherExpense, useDeleteOtherExpense } from '@/hooks/use-expenses';
import { CURRENCY_SYMBOL } from '@/lib/utils/constants';
import type { ExpenseOther } from '@/types';

interface OtherExpenseCardProps {
  category: string;
  label: string;
  emoji: string;
  date: string;
  expenses: ExpenseOther[];
}

export function OtherExpenseCard({ category, label, emoji, date, expenses }: OtherExpenseCardProps) {
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [showInput, setShowInput] = useState(false);

  const addExpense = useAddOtherExpense();
  const deleteExpense = useDeleteOtherExpense();

  const editable = true; // expenses are always editable regardless of date
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const handleAddExpense = async () => {
    if (!newDesc.trim() || !newAmount) return;

    await addExpense.mutateAsync({
      expense_date: date,
      category,
      description: newDesc.trim(),
      amount: Number(newAmount),
    });

    setNewDesc('');
    setNewAmount('');
    setShowInput(false);
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense.mutateAsync({ id, date });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h3 className="font-semibold text-sm uppercase tracking-wide">{label}</h3>
        </div>
        {total > 0 && (
          <span className="text-sm font-bold" style={{ color: 'var(--accent-secondary)' }}>
            {CURRENCY_SYMBOL}{total.toFixed(0)}
          </span>
        )}
      </div>

      {/* Items */}
      <AnimatePresence>
        {expenses.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between py-2"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <span className="text-sm flex-1" style={{ color: 'var(--foreground-muted)' }}>
              {item.description}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {CURRENCY_SYMBOL}{Number(item.amount).toFixed(0)}
              </span>
              {editable && (
                <button
                  onClick={() => handleDeleteExpense(item.id)}
                  className="p-1 rounded-lg transition-colors hover:bg-[var(--danger-muted)]"
                  disabled={deleteExpense.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Item */}
      {editable && (
        <>
          {showInput ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Expense description"
                  autoFocus
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="input-field text-sm"
                  placeholder={`${CURRENCY_SYMBOL}0`}
                  min="0"
                  style={{ flex: 1 }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddExpense}
                  disabled={!newDesc.trim() || !newAmount || addExpense.isPending}
                  className="btn-primary btn-sm flex-1"
                >
                  {addExpense.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </button>
                <button
                  onClick={() => { setShowInput(false); setNewDesc(''); setNewAmount(''); }}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <button
               onClick={() => setShowInput(true)}
               className="mt-3 w-full py-2 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
               style={{
                 color: 'var(--foreground-muted)',
                 background: 'var(--input-bg)',
                 border: '1px dashed var(--card-border)',
               }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Expense
            </button>
          )}
        </>
      )}

      {/* Empty state */}
      {expenses.length === 0 && !showInput && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--foreground-subtle)' }}>
          No expenses logged
        </p>
      )}
    </motion.div>
  );
}
