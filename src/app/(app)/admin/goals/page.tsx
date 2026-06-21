'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, Pencil, ArrowLeft, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import type { User, Goal } from '@/types';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export default function AdminGoalsPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalScore, setGoalScore] = useState('5');
  const queryClient = useQueryClient();

  const { data: users } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => fetchJSON('/api/admin/users'),
  });

  const { data: goals, isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ['admin', 'goals', selectedUserId],
    queryFn: () => fetchJSON(`/api/goals/user/${selectedUserId}`),
    enabled: !!selectedUserId,
  });

  const addGoal = useMutation({
    mutationFn: async (data: { name: string; score_value: number }) => {
      const res = await fetch(`/api/goals/user/${selectedUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'goals', selectedUserId] });
      setShowAdd(false);
      setGoalName('');
      setGoalScore('5');
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; score_value?: number }) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'goals', selectedUserId] });
      setEditGoal(null);
      setGoalName('');
      setGoalScore('5');
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'goals', selectedUserId] });
    },
  });

  const activeUsers = users?.filter(u => u.is_active) || [];
  const activeGoals = goals?.filter(g => g.is_active) || [];
  const inactiveGoals = goals?.filter(g => !g.is_active) || [];

  return (
    <div className="page-content pt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="flex items-center gap-3">
          <Link href="/admin" className="btn-ghost btn-icon btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Goal Management</h1>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              Manage goals for any user
            </p>
          </div>
        </div>

        {/* User Selector */}
        <div>
          <label className="input-label">Select User</label>
          <select
            value={selectedUserId || ''}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
            className="input-field"
          >
            <option value="">Choose a user...</option>
            {activeUsers.map(u => (
              <option key={u.id} value={u.id}>{u.display_name}</option>
            ))}
          </select>
        </div>

        {/* Goals for selected user */}
        {selectedUserId && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground-muted)' }}>
                Active Goals ({activeGoals.length})
              </h2>
              <button onClick={() => { setShowAdd(true); setGoalName(''); setGoalScore('5'); }} className="btn-primary btn-sm">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {goalsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {activeGoals.map(goal => (
                  <div key={goal.id} className="glass-card p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{goal.name}</div>
                      <div className="text-xs" style={{ color: 'var(--accent-primary)' }}>+{goal.score_value} pts</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditGoal(goal); setGoalName(goal.name); setGoalScore(String(goal.score_value)); }}
                        className="btn-ghost btn-icon btn-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${goal.name}"? This will remove ALL entries and recalculate scores.`)) {
                            deleteGoal.mutate(goal.id);
                          }
                        }}
                        disabled={deleteGoal.isPending}
                        className="btn-icon btn-sm"
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {activeGoals.length === 0 && (
                  <p className="text-center text-sm py-4" style={{ color: 'var(--foreground-subtle)' }}>
                    No active goals
                  </p>
                )}
              </div>
            )}

            {inactiveGoals.length > 0 && (
              <>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground-subtle)' }}>
                  Deleted Goals ({inactiveGoals.length})
                </h2>
                <div className="space-y-2 opacity-50">
                  {inactiveGoals.map(goal => (
                    <div key={goal.id} className="glass-card p-3">
                      <div className="text-sm line-through">{goal.name}</div>
                      <div className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
                        +{goal.score_value} pts (deleted)
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Add/Edit Goal Dialog */}
        <AnimatePresence>
          {(showAdd || editGoal) && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                onClick={() => { setShowAdd(false); setEditGoal(null); }}
              />
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-0 left-0 right-0 z-50 p-4"
                style={{ maxWidth: '480px', margin: '0 auto' }}
              >
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold">
                      {editGoal ? 'Edit Goal' : 'Add Goal'}
                    </h2>
                    <button onClick={() => { setShowAdd(false); setEditGoal(null); }} className="btn-ghost btn-icon btn-sm">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editGoal) {
                        updateGoal.mutate({
                          id: editGoal.id,
                          name: goalName.trim(),
                          score_value: Number(goalScore) || 5,
                        });
                      } else {
                        addGoal.mutate({
                          name: goalName.trim(),
                          score_value: Number(goalScore) || 5,
                        });
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="input-label">Goal Name</label>
                      <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        className="input-field"
                        placeholder="e.g., Hit the gym"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="input-label">Score Value</label>
                      <input
                        type="number"
                        value={goalScore}
                        onChange={(e) => setGoalScore(e.target.value)}
                        className="input-field"
                        min="1"
                        required
                      />
                    </div>
                    {(addGoal.isError || updateGoal.isError) && (
                      <p className="text-sm" style={{ color: 'var(--danger)' }}>
                        {addGoal.error?.message || updateGoal.error?.message}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={addGoal.isPending || updateGoal.isPending}
                      className="btn-primary w-full"
                    >
                      {(addGoal.isPending || updateGoal.isPending) ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                      ) : (
                        <><Target className="w-4 h-4" /> {editGoal ? 'Save Changes' : 'Add Goal'}</>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
