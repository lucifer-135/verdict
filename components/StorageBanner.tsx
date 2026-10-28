'use client';

import { useEffect, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { isStorageAvailable } from '@/lib/store/db';

export function StorageBanner() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    isStorageAvailable().then(ok => setBlocked(!ok));
  }, []);
  if (!blocked) return null;
  return (
    <div role="status" className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <WarningCircle aria-hidden size={18} weight="bold" />
      Private browsing can&apos;t save your history.
    </div>
  );
}
