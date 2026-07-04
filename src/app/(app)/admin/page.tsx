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

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedUserIds(new Set(users.map(u => u.id)));
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
              border: !sendToAll ? 'none' : '1px solid var(--glass-border)',
            }}
          >
            Select Users
          </button>
        </div>

        {/* User dropdown (only visible when "Select Users" is active) */}
        {!sendToAll && (
          <div className="space-y-2">
            {/* Dropdown trigger */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: selectedCount > 0 ? 'var(--foreground-primary)' : 'var(--foreground-muted)',
              }}
            >
              <span>{recipientLabel}</span>
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            {/* Selected user pills */}
            {selectedCount > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {users
                  .filter(u => selectedUserIds.has(u.id))
                  .map(u => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 text-xs py-0.5 px-2 rounded-full"
                      style={{
                        background: 'var(--accent-secondary-muted)',
                        color: 'var(--accent-secondary)',
                      }}
                    >
                      {u.display_name}
                      <X
                        className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100"
                        onClick={() => toggleUser(u.id)}
                      />
                    </span>
                  ))}
              </div>
            )}

            {/* Dropdown list */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-lg"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  {/* Select all / Deselect all */}
                  <div
                    className="flex items-center justify-between px-3 py-2 border-b"
                    style={{ borderColor: 'var(--glass-border)' }}
                  >
                    <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                      {users.length} active user{users.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="text-xs font-medium"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        All
                      </button>
                      <button
                        onClick={deselectAll}
                        className="text-xs font-medium"
                        style={{ color: 'var(--foreground-muted)' }}
                      >
                        None
                      </button>
                    </div>
                  </div>

                  {/* User list */}
                  <div className="max-h-48 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--foreground-muted)' }} />
                      </div>
                    ) : users.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: 'var(--foreground-muted)' }}>
                        No active users found
                      </p>
                    ) : (
                      users.map(u => {
                        const isSelected = selectedUserIds.has(u.id);
                        return (
                          <button
                            key={u.id}
                            onClick={() => toggleUser(u.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                            style={{
                              background: isSelected ? 'var(--accent-secondary-muted)' : 'transparent',
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                              style={{
                                background: isSelected ? 'var(--accent-secondary)' : 'transparent',
                                border: isSelected ? 'none' : '1.5px solid var(--foreground-subtle)',
                              }}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium block truncate">
                                {u.display_name}
                              </span>
                            </div>
                            {u.role === 'admin' && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{
                                  background: 'var(--danger-muted)',
                                  color: 'var(--danger)',
                                }}
                              >
                                Admin
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button
        onClick={handleSend}
        disabled={!body.trim() || sending || (!sendToAll && selectedUserIds.size === 0)}
        className="btn-primary w-full"
      >
        {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          : sent    ? <><Check className="w-4 h-4" /> Sent!</>
          : <><Megaphone className="w-4 h-4" /> {sendToAll ? 'Send to all users' : `Send to ${selectedCount} user${selectedCount !== 1 ? 's' : ''}`}</>}
      </button>
    </div>
  );
}

export default function AdminPage() {
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
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--danger-muted)' }}
          >
            <Shield className="w-5 h-5" style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              Manage users, goals, and view logs
            </p>
          </div>
        </div>

        {/* Announcement */}
        <AnnouncementCard />

        {/* Sections */}
        <div className="space-y-3">
          {adminSections.map((section, idx) => (
            <motion.div
              key={section.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link
                href={section.href}
                className="glass-card p-4 flex items-center gap-4 group"
                style={{ display: 'flex', textDecoration: 'none' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: section.bg }}
                >
                  <section.icon className="w-5 h-5" style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{section.label}</div>
                  <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                    {section.description}
                  </div>
                </div>
                <ChevronRight
                  className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1"
                  style={{ color: 'var(--foreground-subtle)' }}
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
