'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useAddMealItem, useDeleteMealItem, useCreateMealSession } from '@/hooks/use-expenses';
import { isWithinEditWindow } from '@/lib/utils/date';
import { CURRENCY_SYMBOL } from '@/lib/utils/constants';
import { useAuth } from '@/hooks/use-auth';
import type { ExpenseMeal, ExpenseMealItem } from '@/types';

interface MealCardProps {
  mealType: string;
  label: string;
  emoji: string;
  date: string;
  meal?: ExpenseMeal & { expense_meal_items: ExpenseMealItem[] };
}

export function MealCard({ mealType, label, emoji, date, meal }: MealCardProps) {
  const { isAdmin } = useAuth();
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [showInput, setShowInput] = useState(false);

  const createSession = useCreateMealSession();
  const addItem = useAddMealItem();
  const deleteItem = useDeleteMealItem();

  const editable = isAdmin || isWithinEditWindow(date);
  const items = meal?.expense_meal_items || [];
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);

  const handleAddItem = async () => {
    if (!newDesc.trim() || !newAmount) return;

    let mealId = meal?.id;

    // Create meal session if it doesn't exist
    if (!mealId) {
      const session = await createSession.mutateAsync({
        expense_date: date,
        meal_type: mealType,
      });
      mealId = (session as { id: string }).id;
    }

    await addItem.mutateAsync({
      mealId,
      description: newDesc.trim(),
      amount: Number(newAmount),
      date,
    });

    setNewDesc('');
    setNewAmount('');
    setShowInput(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!meal?.id) return;
    await deleteItem.mutateAsync({ mealId: meal.id, itemId, date });
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
        {items.map((item) => (
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
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1 rounded-lg transition-colors hover:bg-[var(--danger-muted)]"
                  disabled={deleteItem.isPending}
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
                  placeholder="What did you eat?"
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
                  onClick={handleAddItem}
                  disabled={!newDesc.trim() || !newAmount || addItem.isPending}
                  className="btn-primary btn-sm flex-1"
                >
                  {addItem.isPending ? (
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
              Add Item
            </button>
          )}
        </>
      )}

      {/* Empty state */}
      {items.length === 0 && !showInput && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--foreground-subtle)' }}>
          No items logged
        </p>
      )}
    </motion.div>
  );
}
