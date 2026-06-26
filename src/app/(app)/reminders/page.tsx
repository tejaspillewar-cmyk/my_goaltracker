'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Check, Trash2 } from 'lucide-react';

interface Reminder {
  id: string;
  text: string;
  time: string;
  done: boolean;
}

// Placeholder data — backend + push notifications coming later
const INITIAL: Reminder[] = [
  { id: '1', text: 'Log dinner expenses', time: '9:00 PM', done: false },
  { id: '2', text: 'Evening workout', time: '6:00 PM', done: false },
];

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL);
  const [text, setText] = useState('');
  const [time, setTime] = useState('');

  const add = () => {
    if (!text.trim()) return;
    setReminders(r => [...r, { id: Date.now().toString(), text: text.trim(), time, done: false }]);
    setText('');
    setTime('');
  };

  const toggle = (id: string) =>
    setReminders(r => r.map(x => x.id === id ? { ...x, done: !x.done } : x));

  const remove = (id: string) =>
    setReminders(r => r.filter(x => x.id !== id));

  return (
    <div className="page-content pt-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" style={{ color: '#2dd4ff' }} />
          <h1 className="text-xl font-bold">Reminders</h1>
        </div>

        {/* Note */}
        <div className="glass-card p-3" style={{ borderColor: 'rgba(45,212,255,0.15)', background: 'rgba(45,212,255,0.05)' }}>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Push notifications coming soon. Reminders are stored locally for now.
          </p>
        </div>

        {/* Add reminder */}
        <div className="glass-card p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>New Reminder</h2>
          <input
            type="text"
            className="input-field"
            placeholder="Reminder text…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <input
            type="time"
            className="input-field"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
          <button onClick={add} className="btn-primary w-full">
            <Plus className="w-4 h-4" /> Add Reminder
          </button>
        </div>

        {/* Reminder list */}
        <div className="space-y-2">
          {reminders.length === 0 && (
            <p className="text-sm text-center" style={{ color: 'var(--foreground-subtle)', paddingTop: 16 }}>No reminders yet</p>
          )}
          {reminders.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-3 flex items-center gap-3"
            >
              <button
                onClick={() => toggle(r.id)}
                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${r.done ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'}`, background: r.done ? 'var(--accent-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
              >
                {r.done && <Check style={{ width: 12, height: 12, color: '#000' }} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="text-sm font-medium" style={{ textDecoration: r.done ? 'line-through' : 'none', color: r.done ? 'var(--foreground-subtle)' : 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.text}
                </p>
                {r.time && <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{r.time}</p>}
              </div>
              <button onClick={() => remove(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--foreground-subtle)' }}>
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </div>
  );
}
