'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, Loader2, RotateCcw, UserX, UserCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@/types';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export default function AdminUsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => fetchJSON('/api/admin/users'),
  });

  const createUser = useMutation({
    mutationFn: async (data: { email: string; password: string; display_name: string }) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowCreate(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const resetPw = useMutation({
    mutationFn: async ({ id, new_password }: { id: string; new_password: string }) => {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      setShowReset(null);
      setResetPassword('');
    },
  });

  return (
    <div className="page-content pt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="btn-ghost btn-icon btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">User Management</h1>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              {users?.length || 0} users
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {users?.map((u) => (
              <div key={u.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{
                        background: u.role === 'admin' ? 'var(--danger-muted)' : 'var(--accent-primary-muted)',
                        color: u.role === 'admin' ? 'var(--danger)' : 'var(--accent-primary)',
                      }}
                    >
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{u.display_name}</div>
                      <div className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
                        {u.role} · {u.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowReset(u.id)}
                      className="btn-ghost btn-icon btn-sm"
                      title="Reset Password"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                      className={`btn-icon btn-sm ${u.is_active ? 'btn-danger' : 'btn-primary'}`}
                      title={u.is_active ? 'Deactivate' : 'Reactivate'}
                    >
                      {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Reset Password Inline */}
                <AnimatePresence>
                  {showReset === u.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 space-y-2"
                      style={{ borderTop: '1px solid var(--card-border)' }}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          className="input-field text-sm"
                          placeholder="New temporary password"
                          autoFocus
                        />
                        <button
                          onClick={() => resetPw.mutate({ id: u.id, new_password: resetPassword })}
                          disabled={!resetPassword || resetPassword.length < 6 || resetPw.isPending}
                          className="btn-primary btn-sm"
                        >
                          {resetPw.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reset'}
                        </button>
                        <button onClick={() => setShowReset(null)} className="btn-ghost btn-sm">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {resetPw.isError && (
                        <p className="text-xs" style={{ color: 'var(--danger)' }}>
                          {resetPw.error?.message}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Create User Dialog */}
        <AnimatePresence>
          {showCreate && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                onClick={() => setShowCreate(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-0 left-0 right-0 z-50 p-4"
                style={{ maxWidth: '480px', margin: '0 auto', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
              >
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold">Create User</h2>
                    <button onClick={() => setShowCreate(false)} className="btn-ghost btn-icon btn-sm">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createUser.mutate({ email, password, display_name: displayName });
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="input-label">Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="input-field"
                        placeholder="John Doe"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="input-label">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label">Password</label>
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                        placeholder="Temporary password"
                        required
                        minLength={6}
                      />
                    </div>
                    {createUser.isError && (
                      <p className="text-sm" style={{ color: 'var(--danger)' }}>
                        {createUser.error?.message}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={createUser.isPending}
                      className="btn-primary w-full"
                    >
                      {createUser.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                      ) : (
                        <><Users className="w-4 h-4" /> Create User</>
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
