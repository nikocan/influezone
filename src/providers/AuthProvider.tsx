import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthService, Session } from '@/data/auth/types';
import { DemoAuth } from '@/data/auth/demoAuth';
import { SupabaseAuth } from '@/data/auth/supabaseAuth';
import { isSupabaseConfigured } from '@/lib/env';
import type { Profile } from '@/data/types';
import type { Repository } from '@/data/repository';
import { DemoRepository } from '@/data/demo/DemoRepository';
import { SupabaseRepository } from '@/data/supabase/SupabaseRepository';

interface AuthCtx {
  auth: AuthService;
  repo: Repository;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isModerator: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children, auth: injectedAuth, repo: injectedRepo }: { children: ReactNode; auth?: AuthService; repo?: Repository }) {
  const qc = useQueryClient();
  const sessionRef = useRef<Session | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const auth = useMemo<AuthService>(() => injectedAuth ?? (isSupabaseConfigured ? new SupabaseAuth() : new DemoAuth()), [injectedAuth]);
  const repo = useMemo<Repository>(
    () => injectedRepo ?? (isSupabaseConfigured ? new SupabaseRepository(() => sessionRef.current?.userId ?? null) : new DemoRepository(() => sessionRef.current?.userId ?? null)),
    [injectedRepo],
  );

  const loadProfile = useCallback(
    async (s: Session | null) => {
      sessionRef.current = s;
      setSession(s);
      setProfile(s ? await repo.getProfile(s.userId) : null);
    },
    [repo],
  );

  useEffect(() => {
    let alive = true;
    auth.getSession().then(async (s) => {
      if (!alive) return;
      await loadProfile(s);
      setLoading(false);
    });
    const off = auth.onChange(async (s) => {
      await loadProfile(s);
      qc.invalidateQueries();
    });
    return () => {
      alive = false;
      off();
    };
  }, [auth, loadProfile, qc]);

  const refreshProfile = useCallback(async () => {
    if (sessionRef.current) setProfile(await repo.getProfile(sessionRef.current.userId));
  }, [repo]);

  const value = useMemo<AuthCtx>(
    () => ({
      auth, repo, session, profile, loading, refreshProfile,
      isAdmin: !!session?.roles.includes('admin'),
      isModerator: !!session?.roles.some((r) => r === 'moderator' || r === 'admin'),
    }),
    [auth, repo, session, profile, loading, refreshProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}

export function useRepo() {
  return useAuth().repo;
}
