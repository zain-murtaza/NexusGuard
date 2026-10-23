'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  History,
  Plug,
  CreditCard,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Evidence', href: '/evidence', icon: FileCheck2 },
  { label: 'Controls', href: '/controls', icon: ShieldCheck },
  { label: 'Findings', href: '/findings', icon: AlertTriangle },
  { label: 'Remediation', href: '/remediation', icon: Wrench },
  { label: 'Audit Trail', href: '/audit-trail', icon: History },
  { label: 'Integrations', href: '/integrations', icon: Plug },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, organization, signOut } = useAuth();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-navy-900">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold text-foreground">NexusGuard</span>
          <span className="text-[11px] text-muted-foreground">Security Evidence</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/12 text-primary ring-1 ring-primary/25'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 space-y-3">
        {organization && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className={cn('h-2 w-2 rounded-full', organization.is_demo ? 'bg-primary animate-pulse' : 'bg-emerald-500')} />
            <span className="truncate">{organization.name}</span>
          </div>
        )}
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{user.email}</p>
              <p className="text-[10px] text-muted-foreground">Signed in</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
