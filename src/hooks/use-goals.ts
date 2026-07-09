'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Goal, GoalEntry, DailyScore } from '@/types';

// ============================================================================
// Fetch helpers
// ============================================================================

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ============================================================================
// Hooks
// ============================================================================

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => fetchJSON('/api/goals'),
  });
}

export function useGoalEntries(date: string) {
  return useQuery<GoalEntry[]>({
    queryKey: ['entries', date],
    queryFn: () => fetchJSON(`/api/entries?date=${date}`),
    enabled: !!date,
  });
}

export function useGoalMatrix(month: number, year: number) {
  return useQuery<{
    goals: Goal[];
    entries: GoalEntry[];
    dailyScores: DailyScore[];
  }>({
    queryKey: ['matrix', year, month],
    queryFn: () => fetchJSON(`/api/entries/matrix?month=${month}&year=${year}`),
    enabled: !!month && !!year,
  });
}

export function useDailyScore(date: string) {
  return useQuery<DailyScore>({
    queryKey: ['dailyScore', date],
    queryFn: () => fetchJSON(`/api/scores/daily?date=${date}`),
    enabled: !!date,
  });
}

export function useMonthlyScore(month: number, year: number) {
  return useQuery({
    queryKey: ['monthlyScore', year, month],
    queryFn: () => fetchJSON(`/api/scores/monthly?month=${month}&year=${year}`),
    enabled: !!month && !!year,
  });
}

export function useLeaderboard(month: number, year: number) {
  return useQuery({
    queryKey: ['leaderboard', year, month],
    queryFn: () => fetchJSON(`/api/scores/leaderboard?month=${month}&year=${year}`),
    enabled: !!month && !!year,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; score_value?: number }) =>
      postJSON('/api/goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useToggleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { goal_id: string; entry_date: string; is_checked: boolean }) =>
      postJSON('/api/entries', data),

    // Optimistic update — apply change instantly before API returns
    onMutate: async (variables) => {
      const { goal_id, entry_date, is_checked } = variables;

      // Cancel in-flight refetches so they don't overwrite our optimistic value
      await queryClient.cancelQueries({ queryKey: ['entries', entry_date] });

      // Snapshot current cache for rollback
      const previousEntries = queryClient.getQueryData<GoalEntry[]>(['entries', entry_date]);

      // Optimistically update ['entries', date]
      queryClient.setQueryData<GoalEntry[]>(['entries', entry_date], (old = []) => {
        const exists = old.find(e => e.goal_id === goal_id);
        if (exists) {
          return old.map(e => e.goal_id === goal_id ? { ...e, is_checked } : e);
        }
        // Entry doesn't exist yet — create a placeholder
        return [...old, {
          id: `optimistic-${goal_id}`,
          user_id: '',
          goal_id,
          entry_date,
          is_checked,
          score_earned: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }];
      });

      // Also patch the matrix cache (habits page) so it feels instant there too
      const [entryYear, entryMonth] = entry_date.split('-').map(Number);
      const matrixKey = ['matrix', entryYear, entryMonth];
      const previousMatrix = queryClient.getQueryData(matrixKey);
      queryClient.setQueryData<{ goals: GoalEntry[]; entries: GoalEntry[]; dailyScores: unknown[] }>(matrixKey, (old) => {
        if (!old) return old;
        const entries = old.entries as GoalEntry[];
        const exists = entries.find(e => e.goal_id === goal_id && e.entry_date === entry_date);
        const newEntries = exists
          ? entries.map(e => (e.goal_id === goal_id && e.entry_date === entry_date) ? { ...e, is_checked } : e)
          : [...entries, { id: `optimistic-${goal_id}-${entry_date}`, user_id: '', goal_id, entry_date, is_checked, score_earned: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
        return { ...old, entries: newEntries };
      });

      return { previousEntries, previousMatrix, matrixKey };
    },

    // Roll back on failure
    onError: (_err, variables, context) => {
      if (context?.previousEntries !== undefined) {
        queryClient.setQueryData(['entries', variables.entry_date], context.previousEntries);
      }
      if (context?.previousMatrix !== undefined && context?.matrixKey) {
        queryClient.setQueryData(context.matrixKey, context.previousMatrix);
      }
    },

    // Refetch scores/leaderboard after the API confirms (not blocking the UI)
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entries', variables.entry_date] });
      queryClient.invalidateQueries({ queryKey: ['dailyScore', variables.entry_date] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyScore'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
