import { createGate } from '@/lib/scan/gate';

test('a gate ignores calls while the previous one is running', async () => {
  const gate = createGate();
  let release!: () => void;
  const fn = vi.fn(() => new Promise<void>(r => (release = r)));
  gate.run(fn);
  gate.run(fn);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(gate.busy).toBe(true);
  release();
  await Promise.resolve();
  await Promise.resolve();
  expect(gate.busy).toBe(false);
  gate.run(fn);
  expect(fn).toHaveBeenCalledTimes(2);
});

test('a gate opens again after a failure', async () => {
  const gate = createGate();
  await gate.run(() => Promise.reject(new Error('x'))).catch(() => {});
  expect(gate.busy).toBe(false);
});
