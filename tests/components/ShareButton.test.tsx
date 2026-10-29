import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@/lib/share/verdictCard', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/share/verdictCard')>()),
  drawVerdictCard: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}));

import { ShareButton } from '@/components/ShareButton';
import type { Trial, VerdictResult } from '@/lib/verdict/types';

const trial = { id: 't', productName: 'Serum', concerns: ['oiliness'], startDate: '2026-09-01', goal: null, createdAt: '', isSample: false, archived: false } as Trial;
const verdict = { kind: 'working', reason: 'r', confidence: 'low', perConcern: [], sideEffects: [], goalProgress: null, overlapWarning: null, lateBaseline: false, daysIn: 21 } as VerdictResult;

afterEach(() => {
  delete (navigator as { share?: unknown }).share;
  delete (navigator as { canShare?: unknown }).canShare;
});

test('uses the phone share sheet with the image when the browser can share files', async () => {
  const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {});
  Object.assign(navigator, { share, canShare: () => true });
  render(<ShareButton trial={trial} verdict={verdict} />);
  fireEvent.click(screen.getByRole('button', { name: 'Share verdict' }));
  await waitFor(() => expect(share).toHaveBeenCalled());
  const arg = share.mock.calls[0][0];
  expect(arg.files?.[0].name).toBe('verdict-serum.png');
  expect(arg.files?.[0].type).toBe('image/png');
});

test('downloads the image when sharing files is not supported', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<ShareButton trial={trial} verdict={verdict} />);
  fireEvent.click(screen.getByRole('button', { name: 'Share verdict' }));
  await waitFor(() => expect(click).toHaveBeenCalled());
  click.mockRestore();
});
