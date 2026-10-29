import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ArchivedTrials } from '@/components/ArchivedTrials';
import type { Trial } from '@/lib/verdict/types';

const trial = (id: string, productName: string): Trial => ({
  id,
  productName,
  concerns: ['acne'],
  startDate: '2026-09-01',
  createdAt: '2026-09-01T00:00:00.000Z',
  isSample: false,
  archived: true,
  goal: null,
});

test('lists archived trials with a link and restores one on click', () => {
  const onRestore = vi.fn(async () => {});
  render(<ArchivedTrials trials={[trial('a', 'Retinol')]} onRestore={onRestore} />);
  expect(screen.getByRole('heading', { name: 'Archived' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Retinol' })).toHaveAttribute('href', '/trial/a');
  fireEvent.click(screen.getByRole('button', { name: 'Put Retinol back on shelf' }));
  expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
});

test('renders nothing when no trial is archived', () => {
  const { container } = render(<ArchivedTrials trials={[]} onRestore={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
