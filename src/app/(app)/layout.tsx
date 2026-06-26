'use client';

import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { ThemeProvider } from '@/hooks/use-theme';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <Sidebar />
          <BottomNav />
          <main className="flex-1">
            {children}
          </main>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
