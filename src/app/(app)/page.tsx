'use client';


import { motion } from 'framer-motion';
import Link from 'next/link';
import { Calendar, TrendingUp, ChevronRight, Wallet, Target, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useDailyScore, useLeaderboard } from '@/hooks/use-goals';
import { useExpenses } from '@/hooks/use-expenses';
import { getISTToday, getDayNameFull, formatISTDate, getISTMonthYear, formatMonthYear } from '@/lib/utils/date';
import { MEAL_TYPES, CURRENCY_SYMBOL } from '@/lib/utils/constants';
import type { ExpenseMeal, ExpenseMealItem, LeaderboardEntry } from '@/types';

function ScoreBadgeClass(pct: number): string {
  if (pct >= 80) return 'excellent';
  if (pct >= 60) return 'good';
  if (pct >= 40) return 'average';
  return 'poor';
}

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const today = getISTToday();
  const { year, month } = getISTMonthYear();

  const { data: dailyScore } = useDailyScore(today);
  const { data: expenses } = useExpenses(today);
  const { data: leaderboard } = useLeaderboard(month, year);

  if (authLoading) {
    return (
      <div className="page-content space-y-4 pt-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-36 w-full" />
        <div className="skeleton h-36 w-full" />
      </div>
    );
  }

  const pct = Number(dailyScore?.performance_pct || 0);
  const totalScore = dailyScore?.total_score || 0;
  const maxScore = dailyScore?.max_possible_score || 0;

  // Find current user's rank
  const myRank = (leaderboard as LeaderboardEntry[] | undefined)?.find(
    (e: LeaderboardEntry) => e.user_id === user?.id
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="page-content pt-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        {/* Date Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
              {getDayNameFull(today)}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{formatISTDate(today)}</h1>
          {user && (
            <p className="text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>
              Welcome back, {user.display_name} 👋
            </p>
          )}
        </motion.div>

        {/* Daily Score Card */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-5 glow-emerald">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
                Today&apos;s Score
              </span>
            </div>

            <div className="flex items-end justify-between mb-3">
              <div>
                <span className="text-3xl font-bold">{totalScore}</span>
                <span className="text-lg" style={{ color: 'var(--foreground-subtle)' }}>
                  /{maxScore} pts
                </span>
              </div>
              <span className={`score-badge ${ScoreBadgeClass(pct)}`}>
                <TrendingUp className="w-3.5 h-3.5" />
                {pct.toFixed(0)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar">
              <motion.div
                className={`progress-fill ${pct >= 60 ? 'emerald' : pct >= 40 ? 'amber' : 'danger'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>

        {/* Today's Expenses Card */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
                  Today&apos;s Expenses
                </span>
              </div>
              <span className="text-xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
                {CURRENCY_SYMBOL}{(expenses?.grand_total || 0).toFixed(0)}
              </span>
            </div>

            <div className="space-y-2">
              {MEAL_TYPES.map((mt) => {
                const meal = expenses?.meals?.find(
                  (m: ExpenseMeal & { expense_meal_items: ExpenseMealItem[] }) => m.meal_type === mt.value
                );
                const amount = meal ? Number(meal.total_cost || 0) : 0;

                return (
                  <div key={mt.value} className="flex items-center justify-between py-1">
                    <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      {mt.emoji} {mt.label}
                    </span>
                    <span className="text-sm font-medium">
                      {amount > 0 ? `${CURRENCY_SYMBOL}${amount.toFixed(0)}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Leaderboard Rank */}
        {myRank && (
          <motion.div variants={itemVariants}>
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
                  {formatMonthYear(year, month)} Ranking
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`rank-badge ${myRank.rank <= 3 ? `rank-${myRank.rank}` : 'rank-other'}`}>
                  #{myRank.rank}
                </div>
                <div>
                  <div className="text-sm font-semibold">{myRank.performance_pct}% performance</div>
                  <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                    {myRank.total_score} pts total
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Links */}
        <motion.div variants={itemVariants} className="space-y-2">
          <Link
            href="/expenses"
            className="glass-card p-4 flex items-center justify-between group"
            style={{ display: 'flex', textDecoration: 'none' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📅</span>
              <span className="text-sm font-medium">View This Month&apos;s Spending</span>
            </div>
            <ChevronRight
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              style={{ color: 'var(--foreground-subtle)' }}
            />
          </Link>

          <Link
            href="/habits"
            className="glass-card p-4 flex items-center justify-between group"
            style={{ display: 'flex', textDecoration: 'none' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span className="text-sm font-medium">View This Month&apos;s Habit Tracker</span>
            </div>
            <ChevronRight
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              style={{ color: 'var(--foreground-subtle)' }}
            />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
