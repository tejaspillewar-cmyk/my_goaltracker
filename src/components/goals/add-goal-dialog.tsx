'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2 } from 'lucide-react';
import { useCreateGoal } from '@/hooks/use-goals';

interface AddGoalDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddGoalDialog({ open, onClose }: AddGoalDialogProps) {
  const [name, setName] = useState('');
  const [scoreValue, setScoreValue] = useState('5');
  const createGoal = useCreateGoal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      await createGoal.mutateAsync({
        name: name.trim(),
        score_value: Number(scoreValue) || 5,
      });
      setName('');
      setScoreValue('5');
      onClose();
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
            style={{ maxWidth: '480px', margin: '0 auto', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
          >
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">Add New Goal</h2>
                <button onClick={onClose} className="btn-ghost btn-icon btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="goal-name" className="input-label">
                    Goal Name
                  </label>
                  <input
                    id="goal-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    placeholder="e.g., Hit the gym, Read 30 mins"
                    required
                    autoFocus
                    maxLength={100}
                  />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--foreground-subtle)' }}>
                    Frame positively: &quot;Did not eat junk food&quot; instead of &quot;Ate junk food&quot;
                  </p>
                </div>

                <div>
                  <label htmlFor="score-value" className="input-label">
                    Score Value
                  </label>
                  <input
                    id="score-value"
                    type="number"
                    value={scoreValue}
                    onChange={(e) => setScoreValue(e.target.value)}
                    className="input-field"
                    min="1"
                    max="100"
                    placeholder="5"
                  />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--foreground-subtle)' }}>
                    Points earned when this goal is checked (default: 5)
                  </p>
                </div>

                {createGoal.isError && (
                  <div
                    className="text-sm p-3 rounded-xl"
                    style={{
                      background: 'var(--danger-muted)',
                      color: 'var(--danger)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                    }}
                  >
                    {createGoal.error?.message || 'Failed to create goal'}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!name.trim() || createGoal.isPending}
                  className="btn-primary w-full"
                >
                  {createGoal.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Goal
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
