'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Wallet, BarChart3, User, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/habits', label: 'Habits', icon: CheckSquare },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: User },
];

const adminItem = { href: '/admin', label: 'Admin', icon: Settings };

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const items = isAdmin ? [...navItems, adminItem] : navItems;

  return (
    <nav className="bottom-nav" id="bottom-navigation">
      {items.map((item) => {
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
              <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
