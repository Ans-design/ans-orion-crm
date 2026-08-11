import { describe, expect, it, vi } from 'vitest';
import { withApiHandler } from '@/lib/api-route-handler';

describe('withApiHandler', () => {
  it('retourne la réponse du handler en cas de succès', async () => {
    const handler = withApiHandler('test_ok', async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const res = await handler(new Request('http://localhost'), {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('catch les erreurs et renvoie 503', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = withApiHandler('test_err', async () => {
      throw new Error('boom');
    }, { fallback: { empty: true } });
    const res = await handler(new Request('http://localhost'), {});
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.empty).toBe(true);
    spy.mockRestore();
  });
});
