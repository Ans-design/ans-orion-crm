import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database-url', () => ({
  isPostgresDatabase: () => false,
}));

import { GET } from '@/app/api/health/route';

describe('/api/health', () => {
  it('AUTH-005 — répond minimal sans fuite env/DB', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.app).toBeUndefined();
    expect(body.env).toBeUndefined();
    expect(body.runtime).toBeUndefined();
    expect(Object.keys(body)).toEqual(['ok']);
  });
});
