'use client';

// ============================================================================
// Auth context — provides current user info to client components
// ============================================================================

import { createContext, useContext, useEffect, useState, useMemo, useRef, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  authId: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authId: null,
  isAdmin: false,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authId, setAuthId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create the client once and keep it stable — never recreate it on re-render
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (cancelled) return;

        if (authUser) {
          setAuthId(authUser.id);
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', authUser.id)
            .single();

          if (!cancelled && userData) {
            setUser(userData as User);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setAuthId(session.user.id);
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();

          if (userData) {
            setUser(userData as User);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAuthId(null);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable client ref — no deps needed

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthId(null);
    window.location.href = '/login';
  };

  // Memoize context value so consumers don't re-render unless something actually changed
  const value = useMemo(() => ({
    user,
    authId,
    isAdmin: user?.role === 'admin',
    isLoading,
    signOut,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, authId, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
