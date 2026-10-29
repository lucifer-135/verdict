'use client';

import { useEffect, useState } from 'react';
import { getBlob } from './db';

/**
 * Object URL for a stored blob id (revoked on change/unmount); null while loading or missing.
 * The URL is remembered together with its id, so a render after the id changes never shows
 * the previous blob (the effect that loads the new one runs only after that render).
 */
export function useBlobUrl(id: string | null | undefined): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!id) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    getBlob(id)
      .catch(() => undefined)
      .then(b => {
        if (cancelled || !b) return;
        objectUrl = URL.createObjectURL(b);
        setLoaded({ id, url: objectUrl });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return id && loaded?.id === id ? loaded.url : null;
}
