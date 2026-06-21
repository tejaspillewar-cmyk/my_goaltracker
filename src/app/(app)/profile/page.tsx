'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Loader2, LogOut, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function ProfilePage() {
  const { user, signOut, isLoading } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setChanging(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChanging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-content pt-6 space-y-4">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="page-content pt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold"
            style={{ background: 'var(--accent-primary-muted)', color: 'var(--accent-primary)' }}
          >
            {user?.display_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user?.display_name}</h1>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              {user?.role === 'admin' ? '⚡ Admin' : '👤 User'}
            </p>
          </div>
        </div>

        {/* Change Password */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
              Change Password
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label htmlFor="new-password" className="input-label">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="input-label">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Repeat your password"
                required
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--success)' }}>
                <Check className="w-4 h-4" />
                Password changed successfully!
              </div>
            )}

            <button type="submit" disabled={changing} className="btn-primary w-full">
              {changing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Changing...</>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>

        {/* Sign Out */}
        <button onClick={signOut} className="btn-danger w-full">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
