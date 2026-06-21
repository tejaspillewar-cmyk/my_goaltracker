'use client';

import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { BottomNav } from '@/components/layout/bottom-nav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <main className="flex-1">
          {children}
        </main>
        <BottomNav />
      </AuthProvider>
    </QueryProvider>
  );
}
