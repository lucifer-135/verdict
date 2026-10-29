import { IDBFactory } from 'fake-indexeddb';
import { renderHook, waitFor } from '@testing-library/react';
import { putBlob } from '@/lib/store/db';
import { useBlobUrl } from '@/lib/store/useBlobUrl';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:url-${++n}`);
  URL.revokeObjectURL = vi.fn();
});

test('no render ever returns a URL that belongs to a different (or no) id', async () => {
  const a = await putBlob(new Blob(['a']));
  const b = await putBlob(new Blob(['b']));
  const renders: { id: string | null; url: string | null }[] = [];
  const { result, rerender } = renderHook(
    ({ id }: { id: string | null }) => {
      const url = useBlobUrl(id);
      renders.push({ id, url });
      return url;
    },
    { initialProps: { id: a as string | null } },
  );
  await waitFor(() => expect(result.current).not.toBeNull());
  const urlForA = result.current;

  rerender({ id: null });
  rerender({ id: b });
  await waitFor(() => expect(result.current).not.toBeNull());

  expect(renders.filter(r => r.id === null && r.url !== null)).toEqual([]);
  expect(renders.filter(r => r.id === b && r.url === urlForA)).toEqual([]);
});
