import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CameraCapture } from '@/components/CameraCapture';

const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
afterEach(() => {
  if (original) Object.defineProperty(navigator, 'mediaDevices', original);
  else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
});

test('CameraCapture falls back to file input without mediaDevices', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  render(<CameraCapture onCapture={vi.fn()} />);
  expect(await screen.findByLabelText('Choose a selfie')).toHaveAttribute('capture', 'user');
});

test('CameraCapture falls back when getUserMedia rejects', async () => {
  const getUserMedia = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  render(<CameraCapture onCapture={vi.fn()} />);
  expect(await screen.findByLabelText('Choose a selfie')).toHaveAttribute('accept', 'image/*');
  expect(getUserMedia).toHaveBeenCalledWith(
    expect.objectContaining({ video: expect.objectContaining({ facingMode: 'user' }) }),
  );
});

test('choosing a file calls onCapture with it', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  const onCapture = vi.fn();
  render(<CameraCapture onCapture={onCapture} />);
  const input = await screen.findByLabelText('Choose a selfie');
  const file = new File([new Uint8Array([1])], 'me.jpg', { type: 'image/jpeg' });
  const { fireEvent } = await import('@testing-library/react');
  fireEvent.change(input, { target: { files: [file] } });
  expect(onCapture).toHaveBeenCalledWith(file);
});
