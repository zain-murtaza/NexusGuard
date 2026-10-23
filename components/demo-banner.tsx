'use client';

import { Info } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/8 px-3 py-2 text-xs text-primary">
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong className="font-semibold">Demonstration Workspace</strong> — All data shown is sample evidence for illustration purposes and does not represent a real customer connection or completed audit.
      </span>
    </div>
  );
}
