'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target } from 'lucide-react';
import { GoalMatrix } from '@/components/goals/goal-matrix';
import { AddGoalDialog } from '@/components/goals/add-goal-dialog';
import { useAuth } from '@/hooks/use-auth';

export default function HabitsPage() {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="space-y-4">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-64 w-full" />
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-primary-muted)' }}
            >
              <Target className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Habit Tracker</h1>
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                Check off your daily goals
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddGoal(true)}
            className="btn-primary btn-sm"
            id="add-goal-button"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Matrix */}
        <GoalMatrix />

        {/* Add Goal Dialog */}
        <AddGoalDialog
          open={showAddGoal}
          onClose={() => setShowAddGoal(false)}
        />
      </motion.div>
    </div>
  );
}
