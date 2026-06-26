'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Wallet, Bell, User, Settings, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/',          label: 'Home',      icon: Home },
  { href: '/expenses',  label: 'Expenses',  icon: Wallet },
  { href: '/habits',    label: 'Habits',    icon: CheckSquare },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/profile',   label: 'Profile',   icon: User },
];

const adminItem = { href: '/admin', label: 'Admin', icon: Settings };

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <label className="theme-switch" aria-label="Toggle theme">
      <input
        type="checkbox"
        checked={theme === 'light'}
        onChange={toggleTheme}
      />
      <span className="theme-slider">
        <span className="star star_1" />
        <span className="star star_2" />
        <span className="star star_3" />
        <svg className="cloud" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56">
          <path
            d="M47.4 24.1C47.1 17.2 41.3 11.6 34.3 11.6c-4.5 0-8.5 2.4-10.7 6-1.2-.5-2.5-.8-3.9-.8-5.5 0-10 4.5-10 10 0 .4 0 .8.1 1.2C6.5 29.5 4 33 4 37.1c0 5.5 4.5 10 10 10h28c5.5 0 10-4.5 10-10 0-5.2-4-9.5-9.1-9.9-.2-1-.5-2-1-2.9l.5-.2z"
            fill="white"
          />
        </svg>
      </span>
    </label>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const items = isAdmin ? [...navItems, adminItem] : navItems;

  return (
    <>
      {/* Backdrop overlay when sidebar is expanded */}
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

      {/* Sidebar pill — always visible, expands on toggle */}
      <nav
        className={`sidebar-pill ${isOpen ? 'expanded' : ''}`}
        id="sidebar-navigation"
      >
        {/* Hamburger toggle — first item in the pill */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="sidebar-hamburger"
          id="sidebar-toggle"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <div className="sidebar-nav-icon">
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
          </div>
          {isOpen && <span className="sidebar-nav-label">Menu</span>}
        </button>

        {/* Separator */}
        <div className="sidebar-divider" />

        {/* Nav items */}
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
              {isOpen && (
                <motion.span
                  className="sidebar-nav-label"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {item.label}
                </motion.span>
              )}
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

        {/* Separator before theme toggle */}
        <div className="sidebar-divider" />

        {/* Theme toggle */}
        <div className="sidebar-theme-row">
          <ThemeToggle />
        </div>
      </nav>
    </>
  );
}
