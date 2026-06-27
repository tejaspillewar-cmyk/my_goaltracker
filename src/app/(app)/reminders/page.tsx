'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Plus, Check, Trash2, Loader2 } from 'lucide-react';
import { useReminders, useCreateReminder, useToggleReminder, useDeleteReminder } from '@/hooks/use-reminders';
import { usePushSubscription } from '@/hooks/use-push-subscription';

// Format 'HH:MM:SS' → '9:00 AM'
function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function RemindersPage() {
  const { data: reminders = [], isLoading: loadingReminders } = useReminders();
  const createReminder = useCreateReminder();
  const toggleReminder = useToggleReminder();
  const deleteReminder = useDeleteReminder();
  const { isSubscribed, isLoading: loadingPush, isSupported, permissionState, subscribe, unsubscribe } = usePushSubscription();

  const [text, setText] = useState('');
  const [time, setTime] = useState('');
  const [pushError, setPushError] = useState('');

  const handleAdd = async () => {
    if (!text.trim() || !time) return;
    await createReminder.mutateAsync({ text: text.trim(), reminder_time: time + ':00' });
    setText('');
    setTime('');
  };

  const handlePushToggle = async () => {
    setPushError('');
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Failed to change notification setting');
    }
  };

  return (
    <div className="page-content pt-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" style={{ color: '#2dd4ff' }} />
            <h1 className="text-xl font-bold">Reminders</h1>
          </div>
        </div>

        {/* Push notification toggle */}
        <div
          className="glass-card p-4 flex items-center justify-between gap-3"
          style={{ borderColor: isSubscribed ? 'rgba(45,212,255,0.25)' : undefined }}
        >
          <div style={{ minWidth: 0 }}>
            <p className="text-sm font-medium">{isSubscribed ? 'Notifications on' : 'Enable notifications'}</p>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              {!isSupported
                ? 'Push not supported on this browser'
                : permissionState === 'denied'
                ? 'Blocked — allow in browser settings'
                : isSubscribed
                ? "You'll get OS alerts at reminder time"
                : 'Allow push so reminders fire in the background'}
            </p>
            {pushError && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{pushError}</p>
            )}
          </div>
          <button
            onClick={handlePushToggle}
            disabled={loadingPush || !isSupported || permissionState === 'denied'}
            className={isSubscribed ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
            style={{ flexShrink: 0 }}
          >
            {loadingPush ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSubscribed ? (
              <><BellOff className="w-4 h-4" /> Turn off</>
            ) : (
              <><Bell className="w-4 h-4" /> Turn on</>
            )}
          </button>
        </div>

        {/* Add reminder */}
        <div className="glass-card p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
            New Reminder
          </h2>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Log dinner expenses"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            maxLength={200}
          />
          <input
            type="time"
            className="input-field"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
          <button
            onClick={handleAdd}
            disabled={!text.trim() || !time || createReminder.isPending}
            className="btn-primary w-full"
          >
            {createReminder.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
            ) : (
              <><Plus className="w-4 h-4" /> Add Reminder</>
            )}
          </button>
        </div>

        {/* Reminder list */}
        <div className="space-y-2">
          {loadingReminders && (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="skeleton h-14 rounded-2xl" />)}
            </div>
          )}

          {!loadingReminders && reminders.length === 0 && (
            <p className="text-sm text-center" style={{ color: 'var(--foreground-subtle)', paddingTop: 16 }}>
              No reminders yet — add one above
            </p>
          )}

          {reminders.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-3 flex items-center gap-3"
              style={{ opacity: r.enabled ? 1 : 0.5 }}
            >
              <button
                onClick={() => toggleReminder.mutate({ id: r.id, enabled: !r.enabled })}
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                  border: `2px solid ${r.enabled ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'}`,
                  background: r.enabled ? 'var(--accent-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {r.enabled && <Check style={{ width: 12, height: 12, color: '#fff' }} />}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="text-sm font-medium" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.text}
                </p>
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  {formatTime(r.reminder_time)} · {r.enabled ? 'active' : 'paused'}
                </p>
              </div>

              <button
                onClick={() => deleteReminder.mutate(r.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--foreground-subtle)' }}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </div>
  );
}
