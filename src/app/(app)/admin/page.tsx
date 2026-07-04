'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Users, Target, ScrollText, ChevronRight, Shield, Megaphone, Loader2, Check, ChevronDown, X } from 'lucide-react';

const adminSections = [
  {
    href: '/admin/users',
    icon: Users,
    label: 'User Management',
    description: 'Create, deactivate, and reset passwords',
    color: 'var(--accent-primary)',
    bg: 'var(--accent-primary-muted)',
  },
  {
    href: '/admin/goals',
    icon: Target,
    label: 'Goal Management',
    description: 'Add, edit, and delete goals for any user',
    color: 'var(--accent-secondary)',
    bg: 'var(--accent-secondary-muted)',
  },
  {
    href: '/admin/logs',
    icon: ScrollText,
    label: 'Admin Logs',
    description: 'View all admin actions and changes',
    color: 'var(--info)',
    bg: 'var(--info-muted)',
  },
];

interface UserOption {
  id: string;
  auth_id: string;   // matches push_subscriptions.user_id
  display_name: string;
  role: string;
  is_active: boolean;
}

function AnnouncementCard() {
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  // User selection
  const [users, setUsers]                 = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers]   = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sendToAll, setSendToAll]         = useState(true);
  const [dropdownOpen, setDropdownOpen]   = useState(false);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then((data: UserOption[]) => {
        if (Array.isArray(data)) {
          setUsers(data.filter(u => u.is_active));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  // Toggle by auth_id (matches push_subscriptions.user_id)
  const toggleUser = (authId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(authId)) {
        next.delete(authId);
      } else {
        next.add(authId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedUserIds(new Set(users.map(u => u.auth_id)));
  };

  const deselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const handleSend = async () => {
    if (!body.trim()) return;
    if (!sendToAll && selectedUserIds.size === 0) {
      setError('Select at least one user');
      return;
    }
    setSending(true); setError(''); setSent(false);
    try {
      const res = await fetch('/api/admin/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || '📢 Announcement',
          body: body.trim(),
          userIds: sendToAll ? null : Array.from(selectedUserIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSent(true);
      setTitle(''); setBody('');
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const selectedCount = selectedUserIds.size;
  const recipientLabel = sendToAll
    ? 'All users'
    : selectedCount === 0
      ? 'No users selected'
      : `${selectedCount} user${selectedCount > 1 ? 's' : ''} selected`;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
        <h2 className="text-sm font-semibold">Send Announcement</h2>
      </div>

      <input type="text" className="input-field" placeholder="Title (optional)"
        value={title} onChange={e => setTitle(e.target.value)} maxLength={60} />
      <textarea className="input-field" placeholder="Message…" rows={3}
        value={body} onChange={e => setBody(e.target.value)} maxLength={200}
        style={{ resize: 'none' }} />

      {/* Recipient Selector */}
      <div className="space-y-2">
        <p className="text-xs font-medium" style={{ color: 'var(--foreground-muted)' }}>Send to</p>

        {/* Toggle: All vs Select */}
        <div className="flex gap-2">
          <button
            onClick={() => { setSendToAll(true); setDropdownOpen(false); }}
            className="flex-1 text-xs font-medium py-2 px-3 rounded-lg transition-all"
            style={{
              background: sendToAll ? 'var(--accent-secondary)' : 'var(--glass-bg)',
              color: sendToAll ? '#fff' : 'var(--foreground-secondary)',
              border: sendToAll ? 'none' : '1px solid var(--glass-border)',
            }}
          >
            All Users
          </button>
          <button
            onClick={() => setSendToAll(false)}
            className="flex-1 text-xs font-medium py-2 px-3 rounded-lg transition-all"
            style={{
              background: !sendToAll ? 'var(--accent-secondary)' : 'var(--glass-bg)',
              color: !sendToAll ? '#fff' : 'var(--foreground-secondary)',
              border: 