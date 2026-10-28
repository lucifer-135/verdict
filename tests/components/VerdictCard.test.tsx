import { render, screen } from '@testing-library/react';
import { VerdictCard } from '@/components/VerdictCard';
import type { VerdictResult } from '@/lib/verdict/types';

const verdict: VerdictResult = {
  kind: 'working',
  reason: 'Oiliness improved 5 pts in 3 weeks, above normal scan noise (±3). Keep going.',
  confidence: 'low',
  perConcern: [],
  sideEffects: [],
  goalProgress: 0.5,
  overlapWarning: "Overlaps with Serum B; their effects can't be separated.",
  lateBaseline: false,
  daysIn: 21,
};

test('VerdictCard shows reason, confidence, goal progress and overlap warning', () => {
  render(<VerdictCard verdict={verdict} />);
  expect(screen.getByText('Working')).toBeInTheDocument();
  expect(screen.getByText(verdict.reason)).toBeInTheDocument();
  expect(screen.getByText('Confidence: low')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  expect(screen.getByText(verdict.overlapWarning!)).toBeInTheDocument();
});

test('VerdictCard hides goal progress and overlap when absent', () => {
  render(<VerdictCard verdict={{ ...verdict, goalProgress: null, overlapWarning: null }} />);
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.queryByText(/Overlaps with/)).toBeNull();
});
