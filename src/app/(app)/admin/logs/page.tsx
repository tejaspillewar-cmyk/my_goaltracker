'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { AdminLog } from '@/types';

interface LogEntry extends AdminLog {
  admin?: { display_name: string };
  target?: { display_name: string };
}

export default function AdminLogsPage() {
  const { data, isLoading } = useQuery<{ logs: LogEntry[]; total: number }>({
    queryKey: ['admin', 'logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/logs?limit=100');
      if (!res.ok) throw new Error('Failed to load logs');
      return res.json();
    },
  });

  const logs = data?.logs || [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create_user: '👤 Created user',
      deactivate_user: '🚫 Deactivated user',
      reactivate_user: '✅ Reactivated user',
      reset_password: '🔑 Reset password',
      create_goal: '🎯 Created goal',
      edit_goal: '✏️ Edited goal',
      edit_goal_score: '📊 Changed score',
      delete_goal: '🗑️ Deleted goal',
      edit_entry: '📝 Edited entry',
      edit_user: '👤 Updated user',
    };
    return labels[action] || action;
  };

  return (
    <div className="page-content pt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="flex items-center gap-3">
          <Link href="/admin" className="btn-ghost btn-icon btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Admin Logs</h1>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              {data?.total || 0} total actions
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <ScrollText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--foreground-subtle)' }} />
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>No admin actions recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="glass-card p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{actionLabel(log.action)}</span>
                  <span className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
                    {formatDate(log.created_at)}
                  </span>
                </div>
                <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  by {log.admin?.display_name || 'Unknown'}
                  {log.target?.display_name && ` → ${log.target.display_name}`}
                </div>
                {log.old_value && (
                  <div className="mt-1 text-xs font-mono p-1.5 rounded-lg" style={{ background: 'var(--input-bg)', color: 'var(--foreground-subtle)' }}>
                    {JSON.stringify(log.old_value)}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
