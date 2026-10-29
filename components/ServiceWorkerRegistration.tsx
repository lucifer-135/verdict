'use client';

import { useEffect } from 'react';

/** Registers the offline service worker on the deployed site only; in development it would cache stale builds. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(error => {
      // The app works without it; only offline support is lost.
      console.warn('Service worker registration failed', error);
    });
  }, []);
  return null;
}
