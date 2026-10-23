'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';
import type { Organization, OrgMember, AuthUser } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  organization: Organization | null;
  membership: OrgMember | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, orgName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrgMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (existingSession) {
        setSession(existingSession);
        setUser({ id: existingSession.user.id, email: existingSession.user.email ?? '' });
        await loadOrgContext(existingSession.user.id);
      }
      if (!cancelled) setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        if (newSession) {
          setSession(newSession);
          setUser({ id: newSession.user.id, email: newSession.user.email ?? '' });
          await loadOrgContext(newSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setOrganization(null);
          setMembership(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function loadOrgContext(userId: string) {
    const { data: member } = await supabase
      .from('org_members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (member) {
      setMembership(member as OrgMember);
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', (member as OrgMember).organization_id)
        .maybeSingle();
      if (org) setOrganization(org as Organization);
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signUp(email: string, password: string, orgName: string): Promise<{ error: string | null }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Sign-up failed. Please try again.' };

    const { error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName, slug: orgName.toLowerCase().replace(/\s+/g, '-'), plan: 'free', is_demo: false });

    if (orgError) return { error: orgError.message };

    const { data: newOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', orgName)
      .maybeSingle();

    if (!newOrg) return { error: 'Failed to create organization.' };

    const { error: memberError } = await supabase
      .from('org_members')
      .insert({ user_id: data.user.id, organization_id: newOrg.id, role: 'admin' });

    if (memberError) return { error: memberError.message };

    return { error: null };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setOrganization(null);
    setMembership(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, organization, membership, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useOrgId(): string | null {
  const { organization } = useAuth();
  return organization?.id ?? null;
}
