import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ConfirmButton } from '@/components/ConfirmButton';

const setup = () => {
  const onConfirm = vi.fn();
  render(
    <ConfirmButton label="Archive this trial" question="Archive Serum? It will leave your shelf." confirmLabel="Archive" onConfirm={onConfirm} />,
  );
  return onConfirm;
};

test('asks inside the page before acting (no browser dialog)', () => {
  const confirmSpy = vi.spyOn(window, 'confirm');
  const onConfirm = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Archive this trial' }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Archive Serum? It will leave your shelf.');
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(confirmSpy).not.toHaveBeenCalled();
});

test('cancel closes the question without acting', () => {
  const onConfirm = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Archive this trial' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'Archive this trial' })).toBeInTheDocument();
  expect(onConfirm).not.toHaveBeenCalled();
});
