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
  expect(onCapture).toHaveBeenCalledWith(file, 'picked');
});

describe('last-photo guide', () => {
  beforeEach(() => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      configurable: true,
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  test('shows the previous photo over the live camera and can be turned off', async () => {
    const { container } = render(<CameraCapture onCapture={vi.fn()} guidePhotoUrl="blob:last" />);
    const toggle = await screen.findByRole('button', { name: 'Line up with last photo' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('img[data-guide]')).toHaveAttribute('src', 'blob:last');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('img[data-guide]')).toBeNull();
  });

  test('no guide controls without a previous photo', async () => {
    render(<CameraCapture onCapture={vi.fn()} />);
    await screen.findByRole('button', { name: 'Take photo' });
    expect(screen.queryByRole('button', { name: 'Line up with last photo' })).toBeNull();
  });
});
