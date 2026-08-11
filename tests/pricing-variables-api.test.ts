import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockRequirePermission = vi.fn();
const mockList = vi.fn();
const mockUpdate = vi.fn();
const mockLogAudit = vi.fn();

vi.mock('@/lib/auth-utils', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
}));

vi.mock('@/lib/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock('@/lib/server/modules/pricing/pricing-variables.service', () => ({
  listGlobalPricingVariables: (...args: unknown[]) => mockList(...args),
  updateGlobalPricingVariable: (...args: unknown[]) => mockUpdate(...args),
}));

import { GET, PATCH } from '@/app/api/admin-backoffice/pricing/pricing-variables/route';

describe('pricing-variables API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET refuse sans tarifs:read', async () => {
    mockRequirePermission.mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockList).not.toHaveBeenCalled();
    expect(mockRequirePermission).toHaveBeenCalledWith('tarifs:read');
  });

  it('GET retourne items', async () => {
    mockRequirePermission.mockResolvedValueOnce({
      role: 'admin',
      userId: 'u1',
      userName: 'Admin',
      session: {},
    });
    mockList.mockResolvedValueOnce([
      {
        id: '1',
        code: 'tva_default',
        label: 'TVA',
        value: '20',
        unit: '%',
        valueType: 'number',
        scope: 'global',
        version: 1,
        active: true,
        source: 'seed',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].code).toBe('tva_default');
  });

  it('PATCH met à jour une variable', async () => {
    mockRequirePermission.mockResolvedValueOnce({
      role: 'admin',
      userId: 'u1',
      userName: 'Admin',
      session: {},
    });
    mockUpdate.mockResolvedValueOnce({
      id: '1',
      code: 'face_recto_verso_mult',
      label: 'Multiplicateur Recto-Verso',
      value: '1.9',
      unit: '×',
      valueType: 'number',
      scope: 'global',
      version: 2,
      active: true,
      source: 'admin-pricing-variables',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    mockLogAudit.mockResolvedValueOnce(undefined);

    const req = new NextRequest('http://localhost/api/admin-backoffice/pricing/pricing-variables', {
      method: 'PATCH',
      body: JSON.stringify({ code: 'face_recto_verso_mult', value: '1.9' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.item.value).toBe('1.9');
    expect(mockRequirePermission).toHaveBeenCalledWith('tarifs:write');
    expect(mockUpdate).toHaveBeenCalledWith(
      { code: 'face_recto_verso_mult', value: '1.9' },
      'u1',
    );
  });

  it('PATCH refuse sans code', async () => {
    mockRequirePermission.mockResolvedValueOnce({
      role: 'admin',
      userId: 'u1',
      userName: 'Admin',
      session: {},
    });
    const req = new NextRequest('http://localhost/api/admin-backoffice/pricing/pricing-variables', {
      method: 'PATCH',
      body: JSON.stringify({ value: '1' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
