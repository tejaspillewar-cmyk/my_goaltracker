'use client';

import { motion } from 'framer-motion';
import { BarChart3, Construction } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="page-content pt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--info-muted)' }}
          >
            <BarChart3 className="w-5 h-5" style={{ color: 'var(--info)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              Charts and trends
            </p>
          </div>
        </div>

        <div className="glass-card p-8 text-center">
          <Construction className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--foreground-subtle)' }} />
          <h2 className="text-lg font-semibold mb-1">Coming Soon</h2>
          <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
            Habit trends, spending breakdowns, and goal completion charts will be available in Phase 3.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
