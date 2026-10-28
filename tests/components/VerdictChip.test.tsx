import { render, screen } from '@testing-library/react';
import { VerdictChip } from '@/components/VerdictChip';

test.each([
  ['too_early', 'Too early'],
  ['working', 'Working'],
  ['give_it_time', 'Give it time'],
  ['not_moving', 'Not moving'],
  ['pause', 'Pause'],
] as const)('VerdictChip %s shows "%s"', (kind, label) => {
  render(<VerdictChip kind={kind} />);
  expect(screen.getByText(label)).toBeInTheDocument();
});

test('VerdictChip pairs color with an icon so meaning is not color-only', () => {
  const { container } = render(<VerdictChip kind="pause" />);
  expect(container.querySelector('svg')).not.toBeNull();
});
