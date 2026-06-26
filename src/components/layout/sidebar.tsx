'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Wallet, BarChart3, User, Settings, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/habits', label: 'Habits', icon: CheckSquare },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: User },
];

const adminItem = { href: '/admin', label: 'Admin', icon: Settings };

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const items = isAdmin ? [...navItems, adminItem] : navItems;

  return (
    <>
      {/* Hamburger Toggle Button — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="sidebar-toggle"
        id="sidebar-toggle"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Backdrop overlay when sidebar is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar pill */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            className="sidebar-pill"
            id="sidebar-navigation"
            initial={{ x: -20, opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {items.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  id={`nav-${item.label.toLowerCase()}`}
                >
                  <div className="sidebar-nav-icon">
                    <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="sidebar-active-indicator"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
