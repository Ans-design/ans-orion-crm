import { describe, expect, it } from 'vitest';
import { runApiHandler } from '@/lib/api-guard';

describe('api-guard', () => {
  it('retourne la réponse du handler en cas de succès', async () => {
    const res = await runApiHandler('test', async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('capture les erreurs et renvoie un JSON stable', async () => {
    const res = await runApiHandler('test-fail', async () => {
      throw new Error('boom');
    }, { fallback: { items: [] } });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.items).toEqual([]);
    expect(body.error.message).toBeTruthy();
  });

  it('supporte fallbackResponse pour les endpoints tableau', async () => {
    const res = await runApiHandler('test-array', async () => {
      throw new Error('fail');
    }, { fallbackResponse: [] });
    expect(await res.json()).toEqual([]);
  });
});
