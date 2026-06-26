'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, CheckSquare, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/',          label: 'Home',     icon: Home },
  { href: '/expenses',  label: 'Expenses', icon: Wallet },
  { href: '/habits',    label: 'Habits',   icon: CheckSquare },
  { href: '/reminders', label: 'Reminders',icon: Bell },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" id="bottom-navigation">
      {navItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            id={`nav-${item.label.toLowerCase()}`}
          >
            {isActive && (
              <motion.div
                layoutId="bottom-nav-pill"
                className="bottom-nav-active-bg"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <div className="bottom-nav-icon">
              <item.icon style={{ width: 20, height: 20 }} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
