'use client';

import { useEffect, useState } from 'react';
import { WifiSlash } from '@phosphor-icons/react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="flex items-center gap-2 bg-slate-100 px-4 py-2 text-sm text-slate-800">
      <WifiSlash aria-hidden size={18} weight="bold" />
      You are offline. Your saved trials still open, but scanning needs a connection.
    </div>
  );
}
