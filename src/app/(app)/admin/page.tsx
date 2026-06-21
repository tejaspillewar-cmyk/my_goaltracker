'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Target, ScrollText, ChevronRight, Shield } from 'lucide-react';

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
