'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExpenseDaySummary } from '@/types';

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

async function deleteJSON(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
}

export function useMonthlyDays(month: number, year: number) {
  return useQuery<{ date: string; total: number }[]>({
    queryKey: ['expenses-monthly-days', year, month],
    queryFn: () => fetchJSON(`/api/expenses/monthly-days?month=${month}&year=${year}`),
    enabled: !!month && !!year,
  });
}

export function useExpenses(date: string) {
  return useQuery<ExpenseDaySummary>({
    queryKey: ['expenses', date],
    queryFn: () => fetchJSON(`/api/expenses?date=${date}`),
    enabled: !!date,
  });
}

export function useCreateMealSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { expense_date: string; meal_type: string }) =>
      postJSON('/api/expenses/meals', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.expense_date] });
    },
  });
}

export function useAddMealItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mealId,
      description,
      amount,
    }: {
      mealId: string;
      description: string;
      amount: number;
      date: string;
    }) => postJSON(`/api/expenses/meals/${mealId}/items`, { description, amount }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.date] });
    },
  });
}

export function useDeleteMealItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mealId, itemId, date }: { mealId: string; itemId: string; date: string }) =>
      deleteJSON(`/api/expenses/meals/${mealId}/items?itemId=${itemId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.date] });
    },
  });
}

export function useAddOtherExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      expense_date: string;
      category: string;
      description: string;
      amount: number;
    }) => postJSON('/api/expenses/others', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.expense_date] });
    },
  });
}

export function useDeleteOtherExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      deleteJSON(`/api/expenses/others?id=${id}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.date] });
    },
  });
}
