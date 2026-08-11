import { describe, expect, it, vi } from 'vitest';
import { withTimeout } from '@/lib/with-timeout';

describe('withTimeout', () => {
  it('résout si la promesse est rapide', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it('rejette si délai dépassé', async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve('late'), 200));
    await expect(withTimeout(slow as Promise<string>, 50, 'test')).rejects.toThrow('test timeout');
  });
});
