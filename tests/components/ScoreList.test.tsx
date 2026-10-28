import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ScoreList } from '@/components/ScoreList';

const scores = {
  pore: { raw: 79, ui: 80 },
  oiliness: { raw: 38, ui: 40 },
  redness: { raw: 60, ui: 65 },
};

test('ScoreList sorts worst first and shows labels', () => {
  render(<ScoreList scores={scores} />);
  const labels = screen.getAllByRole('listitem').map(li => li.textContent);
  expect(labels[0]).toContain('Oiliness');
  expect(labels[0]).toContain('40');
  expect(labels[1]).toContain('Redness');
  expect(labels[2]).toContain('Pores');
});

test('ScoreList rows with a mask are toggle buttons', () => {
  const onSelect = vi.fn();
  render(<ScoreList scores={scores} withMask={new Set(['oiliness'])} selected="oiliness" onSelect={onSelect} />);
  const button = screen.getByRole('button', { name: /Oiliness/ });
  expect(button).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(button);
  expect(onSelect).toHaveBeenCalledWith('oiliness');
  expect(screen.queryByRole('button', { name: /Pores/ })).toBeNull();
});
