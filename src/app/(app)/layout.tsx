'use client';

import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <Sidebar />
        <main className="flex-1">
          {children}
        </main>
      </AuthProvider>
    </QueryProvider>
  );
}
