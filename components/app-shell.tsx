'use client';

import { useState } from 'react';
import { Menu, X, Shield, Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const publicPaths = ['/login', '/signup'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isPublicPath = publicPaths.includes(pathname);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading NexusGuard...</span>
        </div>
      </div>
    );
  }

  if (!user && !isPublicPath) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isPublicPath) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full animate-slide-in-right">
            <Sidebar />
          </div>
          <button
            className="absolute right-4 top-4 text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">NexusGuard</span>
          </div>
        </header>

        <main className={cn('flex-1 overflow-y-auto scrollbar-thin')}>
          {children}
        </main>
      </div>
    </div>
  );
}
