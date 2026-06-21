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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entries', variables.entry_date] });
      queryClient.invalidateQueries({ queryKey: ['dailyScore', variables.entry_date] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyScore'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
