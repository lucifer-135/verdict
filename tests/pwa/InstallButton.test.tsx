import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { InstallButton } from '@/components/InstallButton';

test('hidden until the browser offers installation, then prompts on click', async () => {
  render(<InstallButton />);
  expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
  const prompt = vi.fn(async () => {});
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Install app' }));
  expect(prompt).toHaveBeenCalled();
  await act(async () => {});
  expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
});
