import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/server/http/errors';
import { ok, badRequest, fromError } from '@/lib/server/http/api-response';

describe('server/http/api-response', () => {
  it('ok returns standard envelope', async () => {
    const res = ok({ items: [] }, { total: 0 });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ items: [] });
    expect(body.meta).toEqual({ total: 0 });
  });

  it('badRequest returns error envelope', async () => {
    const res = badRequest('Invalid', { field: 'email' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('fromError maps ApiError', async () => {
    const res = fromError(ApiError.notFound('Client introuvable'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
