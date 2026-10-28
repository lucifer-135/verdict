'use client';

import { useEffect, useState } from 'react';
import { getBlob } from './db';

/** Object URL for a stored blob id (revoked on change/unmount); null while loading or missing. */
export function useBlobUrl(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return setUrl(null);
    let objectUrl: string | null = null;
    let cancelled = false;
    getBlob(id).then(b => {
      if (cancelled || !b) return;
      objectUrl = URL.createObjectURL(b);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url;
}
