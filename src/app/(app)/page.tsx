'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, User, Bell, Plus, CheckSquare, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useDailyScore, useGoals, useGoalEntries, useLeaderboard, useToggleEntry } from '@/hooks/use-goals';
import { useExpenses } from '@/hooks/use-expenses';
import { useReminders } from '@/hooks/use-reminders';
import { getISTToday, getDayNameFull, formatISTDate, getISTMonthYear } from '@/lib/utils/date';
import { CURRENCY_SYMBOL } from '@/lib/utils/constants';
import type { LeaderboardEntry, Goal, GoalEntry, ExpenseMeal, ExpenseMealItem } from '@/types';

// ============================================================================
// Circular Progress SVG
// ============================================================================
function CircularProgress({ value, max, size = 80 }: { value: number; max: number; size?: number }) {
  const sw = 7;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circ * (1 - pct);
  const uid = 'pg';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(31,111,235,0.12)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${uid})`} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <defs>
        <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2dd4ff" />
          <stop offset="100%" stopColor="#1f6feb" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ============================================================================
// Flip Card shell
// ============================================================================
function FlipCard({ front, back }: { front: React.ReactNode; back: React.ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="flip-card" onClick={() => setFlipped(f => !f)}>
      <div className={`flip-card-inner${flipped ? ' flipped' : ''}`}>
        <div className="flip-card-front glass-card-dashboard">{front}</div>
        <div className="flip-card-back glass-card-dashboard">{back}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Card face shared styles
// ============================================================================
const face: React.CSSProperties = {
  width: '100%', height: '100%', display: 'flex',
  flexDirection: 'column', padding: '12px 11px', overflow: 'hidden',
};
const label: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: 'var(--foreground-muted)', marginBottom: 4,
};

// ============================================================================
// Points Card
// ============================================================================
function PointsCard({
  dailyScore, leaderboard, userId,
}: {
  dailyScore: { performance_pct: number; total_score: number; max_possible_score: number } | undefined;
  leaderboard: LeaderboardEntry[];
  userId: string;
}) {
  const pct = Number(dailyScore?.performance_pct || 0);
  const total = dailyScore?.total_score || 0;
  const max = dailyScore?.max_possible_score || 0;
  const myRank = leaderboard.find(e => e.user_id === userId);

  return (
    <FlipCard
      front={
        <div style={{ ...face, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress value={total} max={max || 1} size={78} />
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{pct.toFixed(0)}%</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...label, marginBottom: 1 }}>Today's Points</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-secondary)' }}>{total} / {max} pts</div>
          </div>
        </div>
      }
      back={
        <div style={face}>
          <div style={label}>This Month</div>
          {myRank && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 10, background: 'rgba(31,111,235,0.15)', border: '1px solid rgba(45,212,255,0.15)', marginBottom: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#2dd4ff' }}>#{myRank.rank}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground)' }}>Your Rank</div>
                <div style={{ fontSize: 10, color: 'var(--foreground-muted)' }}>{myRank.performance_pct}% · {myRank.total_score}pts</div>
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {leaderboard.slice(0, 4).map((e: LeaderboardEntry) => (
              <div key={e.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: e.user_id === userId ? '#2dd4ff' : 'var(--foreground-muted)' }}>
                  #{e.rank} {e.display_name}
                </span>
                <span style={{ color: 'var(--foreground-subtle)' }}>{e.performance_pct}%</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: 'var(--foreground-subtle)', textAlign: 'center', marginTop: 4 }}>tap to flip back</div>
        </div>
      }
    />
  );
}

// ============================================================================
// Expenses Card
// ============================================================================
function ExpensesCard({ expenses }: { expenses: { grand_total: number; meals: (ExpenseMeal & { expense_meal_items: ExpenseMealItem[] })[] } | undefined }) {
  const router = useRouter();
  const total = expenses?.grand_total || 0;
  const meals = (expenses?.meals || []).filter(m => Number(m.total_cost) > 0);

  return (
    <FlipCard
      front={
        <div style={{ ...face, alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Wallet style={{ width: 20, height: 20, color: 'var(--accent-secondary)', opacity: 0.75 }} />
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-secondary)', lineHeight: 1 }}>
            {CURRENCY_SYMBOL}{total.toFixed(0)}
          </div>
          <div style={{ ...label, marginBottom: 0 }}>Spent Today</div>
        </div>
      }
      back={
        <div style={face}>
          <div style={label}>Breakdown</div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {meals.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--foreground-subtle)', textAlign: 'center', marginTop: 10 }}>No expenses yet</div>
            ) : (
              meals.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--foreground-muted)', textTransform: 'capitalize' }}>
                    {m.meal_type.replace('_', ' ')}
                  </span>
                  <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
                    {CURRENCY_SYMBOL}{Number(m.total_cost).toFixed(0)}
                  </span>
                </div>
              ))
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); router.push('/expenses'); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 0', borderRadius: 9, background: 'rgba(31,111,235,0.2)', border: '1px solid rgba(45,212,255,0.18)', color: '#2dd4ff', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
          >
            <Plus style={{ width: 12, height: 12 }} /> Add Expense
          </button>
        </div>
      }
    />
  );
}

// ============================================================================
// Habits Card
// ============================================================================
function HabitsCard({ goals, entries, date }: { goals: Goal[]; entries: GoalEntry[]; date: string }) {
  const toggle = useToggleEntry();
  const active = goals.filter(g => g.is_active);
  const checked = entries.filter(e => e.is_checked).length;
  const total = active.length;
  const barPct = total > 0 ? (checked / total) * 100 : 0;

  return (
    <FlipCard
      front={
        <div style={{ ...face, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <CheckSquare style={{ width: 20, height: 20, color: 'var(--accent-primary)', opacity: 0.75 }} />
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{checked}</span>
            <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>/{total}</span>
          </div>
          <div style={{ ...label, marginBottom: 2 }}>Habits Done</div>
          <div style={{ width: '68%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: 'var(--accent-primary)', width: `${barPct}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      }
      back={
        <div style={face}>
          <div style={label}>Today's Habits</div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {active.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--foreground-subtle)', textAlign: 'center', marginTop: 10 }}>No habits set</div>
            ) : (
              active.map(goal => {
                const entry = entries.find(e => e.goal_id === goal.id);
                const done = entry?.is_checked || false;
                return (
                  <button
                    key={goal.id}
                    onClick={e => { e.stopPropagation(); toggle.mutate({ goal_id: goal.id, entry_date: date, is_checked: !done }); }}
                    disabled={toggle.isPending}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: toggle.isPending ? 'wait' : 'pointer', textAlign: 'left', padding: '2px 0', width: '100%', opacity: toggle.isPending ? 0.6 : 1 }}
                  >
                    <div style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${done ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'}`, background: done ? 'var(--accent-primary)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {done && <span style={{ color: '#000', fontSize: 8, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 11, color: done ? 'var(--foreground-subtle)' : 'var(--foreground)', textDecoration: done ? 'line-through' : 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {goal.name}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--accent-primary)', fontWeight: 600, flexShrink: 0 }}>+{goal.score_value}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      }
    />
  );
}

// ============================================================================
// Reminders Card — live from Supabase
// ============================================================================
function RemindersCard({ reminders }: { reminders: { id: string; text: string; reminder_time: string; enabled: boolean }[] }) {
  const router = useRouter();
  const active = reminders.filter(r => r.enabled);

  const fmtTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <FlipCard
      front={
        <div style={{ ...face, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Bell style={{ width: 20, height: 20, color: '#2dd4ff', opacity: 0.75 }} />
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{active.length}</div>
          <div style={{ ...label, marginBottom: 0 }}>Reminders</div>
        </div>
      }
      back={
        <div style={face}>
          <div style={label}>Active</div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {active.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--foreground-subtle)', textAlign: 'center', marginTop: 10 }}>No reminders set</div>
            ) : (
              active.slice(0, 4).map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ width: 13, height: 13, borderRadius: 3, border: '1.5px solid rgba(45,212,255,0.35)', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--foreground)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{r.text}</div>
                    <div style={{ fontSize: 9, color: 'var(--foreground-subtle)' }}>{fmtTime(r.reminder_time)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); router.push('/reminders'); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 0', borderRadius: 9, background: 'rgba(45,212,255,0.08)', border: '1px solid rgba(45,212,255,0.18)', color: '#2dd4ff', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
          >
            Manage Reminders
          </button>
        </div>
      }
    />
  );
}

// ============================================================================
// Dashboard Page
// ============================================================================
export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const today = getISTToday();
  const { year, month } = getISTMonthYear();

  const { data: dailyScore } = useDailyScore(today);
  const { data: expenses } = useExpenses(today);
  const { data: leaderboard } = useLeaderboard(month, year);
  const { data: goals = [] } = useGoals();
  const { data: entries = [] } = useGoalEntries(today);
  const { data: reminders = [] } = useReminders();

  if (authLoading) {
    return (
      <div className="dashboard-page">
        <div className="skeleton" style={{ height: 70, borderRadius: 16, marginBottom: 14 }} />
        <div className="dashboard-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ borderRadius: 20 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header — date left, profile icon right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <Calendar style={{ width: 13, height: 13, color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground-muted)' }}>{getDayNameFull(today)}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, margin: 0 }}>{formatISTDate(today)}</h1>
          {user && <p style={{ fontSize: 12, color: 'var(--foreground-muted)', margin: '3px 0 0' }}>Welcome back, {user.display_name} 👋</p>}
        </div>
        <Link href="/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-primary-muted)', border: '1px solid rgba(31,111,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: 'var(--accent-primary)' }}>
            {user?.display_name?.charAt(0).toUpperCase() || <User style={{ width: 16, height: 16 }} />}
          </div>
        </Link>
      </div>

      {/* 2×2 Flip Card Grid */}
      <div className="dashboard-grid">
        <PointsCard
          dailyScore={dailyScore}
          leaderboard={(leaderboard as LeaderboardEntry[]) || []}
          userId={user?.id || ''}
        />
        <ExpensesCard expenses={expenses} />
        <HabitsCard goals={goals as Goal[]} entries={entries as GoalEntry[]} date={today} />
        <RemindersCard reminders={reminders} />
      </div>
    </div>
  );
}
