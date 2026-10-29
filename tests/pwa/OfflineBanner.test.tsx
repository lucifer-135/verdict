import { act, render, screen } from '@testing-library/react';
import { OfflineBanner } from '@/components/OfflineBanner';

test('tells the user when the connection drops and when it returns', () => {
  render(<OfflineBanner />);
  expect(screen.queryByRole('status')).toBeNull();
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
  expect(screen.getByRole('status')).toHaveTextContent(
    'You are offline. Your saved trials still open, but scanning needs a connection.',
  );
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
  expect(screen.queryByRole('status')).toBeNull();
});
