'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useBudgetLimits } from '@/hooks/use-budget';
import { useMonthlyDays } from '@/hooks/use-expenses';
import { CURRENCY_SYMBOL } from '@/lib/utils/constants';

interface DayTotalCardProps {
  date: string;       // YYYY-MM-DD (IST)
  dayTotal: number;   // today's grand total, already fetched by parent
}

function isWeekend(dateStr: string): boolean {
  return [0, 6].includes(new Date(dateStr + 'T00:00:00+05:30').getDay());
}

function getLimitForDate(dateStr: string, weekdayLimit: number, weekendLimit: number): number {
  return isWeekend(dateStr) ? weekendLimit : weekdayLimit;
}

export function DayTotalCard({ date, dayTotal }: DayTotalCardProps) {
  const [expanded, setExpanded] = useState(false);

  const dateObj = new Date(date + 'T00:00:00+05:30');
  const year  = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day   = dateObj.getDate();

  const { data: limits } = useBudgetLimits(month, year);
  const { data: monthlyDays, isLoading: daysLoading } = useMonthlyDays(month, year);

  // Resolve limits (support legacy single 'daily_total' too)
  const weekdayLimit = limits?.find(l => l.category === 'daily_total_weekday')?.daily_limit
    ?? limits?.find(l => l.category === 'daily_total')?.daily_limit
    ?? 0;
  const weekendLimit = limits?.find(l => l.category === 'daily_total_weekend')?.daily_limit
    ?? limits?.find(l => l.category === 'daily_total')?.daily_limit
    ?? 0;

  const hasBudget = weekdayLimit > 0 || weekendLimit > 0;

  // Build a map of date → total from the API
  const dayTotalsMap = new Map<string, number>(
    (monthlyDays || []).map(d => [d.date, d.total])
  );
  // Ensure today's actual spending (from parent, most up-to-date) is used
  dayTotalsMap.set(date, dayTotal);

  // ── Carry-forward: sum(budget - spent) for days 1..yesterday ──
  let carryForward = 0;
  if (hasBudget) {
    for (let d = 1; d < day; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const budget  = getLimitForDate(dateStr, weekdayLimit, weekendLimit);
      const spent   = dayTotalsMap.get(dateStr) || 0;
      carryForward += budget - spent;
    }
  }

  // Today's budget + carry-forward = effective budget for today
  const todayBudget  = getLimitForDate(date, weekdayLimit, weekendLimit);
  const effectiveBudget = todayBudget + carryForward;
  // Net position as of end of today: positive = ahead, negative = over
  const netToday = effectiveBudget - dayTotal;

  // ── Monthly budget ──
  const daysInMonth = new Date(year, month, 0).getDate();
  let weekdayCount = 0, weekendCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (isWeekend(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)) {
      weekendCount++;
    } else {
      weekdayCount++;
    }
  }
  const monthlyBudget = weekdayCount * weekdayLimit + weekendCount * weekendLimit;
  const monthlySpent  = Array.from(dayTotalsMap.values()).reduce((a, b) => a + b, 0);
  const monthlyRemaining = monthlyBudget - monthlySpent;

  // ── Helpers ──
  const fmt = (n: number) => `${CURRENCY_SYMBOL}${Math.abs(n).toFixed(0)}`;
  const sign = (n: number) => n >= 0 ? '+' : '−';

  return (
    <div className="glass-card overflow-hidden" style={{ background: 'var(--glass-bg)' }}>
      {/* Always-visible header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
          Day Total
        </span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
            {CURRENCY_SYMBOL}{dayTotal.toFixed(0)}
          </span>
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{
              color: 'var(--foreground-subtle)',
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
          />
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {daysLoading ? (
              <div className="flex items-center justify-center pb-4">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--foreground-muted)' }} />
              </div>
            ) : (
              <div
                className="px-4 pb-4 space-y-0"
                style={{ borderTop: '1px solid var(--glass-border)' }}
              >
                {/* Row 1: Day total (repeat, with label) */}
                <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--foreground-muted)' }}>Today's spending</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-subtle)' }}>
                      Budget: {hasBudget ? `${CURRENCY_SYMBOL}${todayBudget}` : 'not set'}
                    </div>
                  </div>
                  <span
                    className="text-lg font-bold"
                    style={{ color: hasBudget && dayTotal > todayBudget ? 'var(--danger)' : 'var(--foreground)' }}
                  >
                    {CURRENCY_SYMBOL}{dayTotal.toFixed(0)}
                  </span>
                </div>

                {/* Row 2: Carry-forward net */}
                {hasBudget ? (
                  <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: 'var(--foreground-muted)' }}>Net with carry-forward</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-subtle)' }}>
                        {carryForward >= 0
                          ? `${CURRENCY_SYMBOL}${Math.abs(carryForward).toFixed(0)} surplus from prev days`
                          : `${CURRENCY_SYMBOL}${Math.abs(carryForward).toFixed(0)} deficit from prev days`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-lg font-bold"
                        style={{ color: netToday >= 0 ? 'var(--success, #22c55e)' : 'var(--danger)' }}
                      >
                        {sign(netToday)}{fmt(netToday)}
                      </span>
                      <div className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
                        {netToday >= 0 ? 'ahead' : 'over'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-xs" style={{ color: 'var(--foreground-subtle)', borderBottom: '1px solid var(--glass-border)' }}>
                    Set a budget to see carry-forward tracking.
                  </div>
                )}

                {/* Row 3: Monthly overview */}
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--foreground-muted)' }}>Monthly budget</div>
                    {hasBudget && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-subtle)' }}>
                        {weekdayCount}×{CURRENCY_SYMBOL}{weekdayLimit} + {weekendCount}×{CURRENCY_SYMBOL}{weekendLimit}
                      </div>
                    )}
                  </div>
                  {hasBudget ? (
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                        {CURRENCY_SYMBOL}{monthlySpent.toFixed(0)} / {CURRENCY_SYMBOL}{monthlyBudget.toFixed(0)}
                      </div>
                      <div
                        className="text-xs font-medium"
                        style={{ color: monthlyRemaining >= 0 ? 'var(--success, #22c55e)' : 'var(--danger)' }}
                      >
                        {monthlyRemaining >= 0
                          ? `${CURRENCY_SYMBOL}${monthlyRemaining.toFixed(0)} left`
                          : `${CURRENCY_SYMBOL}${Math.abs(monthlyRemaining).toFixed(0)} over`}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm font-bold" style={{ color: 'var(--foreground-subtle)' }}>
                      {CURRENCY_SYMBOL}{monthlySpent.toFixed(0)} spent
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
