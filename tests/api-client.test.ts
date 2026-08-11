import { describe, expect, it } from 'vitest';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';

describe('api-client', () => {
  it('unwrapApiData reads standard envelope', () => {
    expect(unwrapApiData({ ok: true, data: { count: 3 } })).toEqual({ count: 3 });
  });

  it('unwrapApiData passes through legacy body', () => {
    expect(unwrapApiData({ items: [1] })).toEqual({ items: [1] });
  });

  it('getApiErrorMessage reads standard error', () => {
    expect(
      getApiErrorMessage({ ok: false, error: { message: 'Session expirée', code: 'UNAUTHORIZED' } }),
    ).toBe('Session expirée');
  });

  it('getApiErrorMessage reads legacy string error', () => {
    expect(getApiErrorMessage({ error: 'Permission insuffisante' })).toBe('Permission insuffisante');
  });
});
