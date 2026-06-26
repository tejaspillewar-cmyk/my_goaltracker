'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BudgetLimit } from '@/types';

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

export function useBudgetLimits(month: number, year: number) {
  return useQuery<BudgetLimit[]>({
    queryKey: ['budget', year, month],
    queryFn: () => fetchJSON(`/api/budget?month=${month}&year=${year}`),
    enabled: !!month && !!year,
  });
}

export function useUpdateBudgetLimit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      year: number;
      month: number;
      category: string;
      daily_limit?: number | null;
      monthly_limit?: number | null;
    }) => postJSON('/api/budget', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budget', variables.year, variables.month] });
    },
  });
}
