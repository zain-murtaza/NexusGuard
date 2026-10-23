'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (typeof window !== 'undefined') {
      window.location.href = user ? '/overview' : '/login';
    }
  }, [user, loading]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  );
}
