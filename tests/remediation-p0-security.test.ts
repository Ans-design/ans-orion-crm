import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripPurchasePriceFields, canViewMargin } from '@/lib/auth/margin-access';
import { validateUploadBuffer } from '@/lib/uploads/validate-upload';
import { isPublicPage } from '@/lib/auth/public-routes';
import { isStrictPosPricing } from '@/lib/pos/pos-price-policy';

describe('SEC-03 stripPurchasePriceFields', () => {
  const row = {
    id: 'm1',
    label: 'Bâche',
    purchasePrice: 12000,
    lastPurchasePrice: 11000,
    basePrintPrice: 25000,
  };

  it('retire purchasePrice pour rôle sans marge', () => {
    expect(canViewMargin('commercial')).toBe(false);
    const stripped = stripPurchasePriceFields(row, 'commercial');
    expect(stripped).not.toHaveProperty('purchasePrice');
    expect(stripped).not.toHaveProperty('lastPurchasePrice');
    expect(stripped.basePrintPrice).toBe(25000);
  });

  it('conserve purchasePrice pour admin (pos:view_margin)', () => {
    expect(canViewMargin('admin')).toBe(true);
    const kept = stripPurchasePriceFields(row, 'admin');
    expect(kept.purchasePrice).toBe(12000);
  });

  it('material-rules GET strippe blank-materials (code path)', () => {
    const src = readFileSync(
      join(process.cwd(), 'app/api/admin-backoffice/pricing/material-rules/route.ts'),
      'utf8',
    );
    expect(src).toMatch(/stripPurchasePriceFieldsDeep/);
    expect(src).toMatch(/blankMaterialColumnsForRole/);
  });
});

describe('SEC-02 /dev-health plus public', () => {
  it('ne liste plus /dev-health comme page publique', () => {
    expect(isPublicPage('/dev-health')).toBe(false);
    expect(isPublicPage('/login')).toBe(true);
  });
});

describe('SEC-05/06 validateUploadBuffer', () => {
  it('refuse SVG', () => {
    const buf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const r = validateUploadBuffer('evil.svg', buf);
    expect(r.ok).toBe(false);
  });

  it('refuse path traversal', () => {
    const buf = Buffer.from('%PDF-1.4');
    const r = validateUploadBuffer('../etc/passwd.pdf', buf);
    expect(r.ok).toBe(false);
  });

  it('accepte PDF avec magic bytes', () => {
    const buf = Buffer.from('%PDF-1.4 fake content here');
    const r = validateUploadBuffer('bat.pdf', buf);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.detectedMime).toBe('application/pdf');
  });

  it('refuse faux MIME image avec extension pdf', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const r = validateUploadBuffer('faux.pdf', png);
    expect(r.ok).toBe(false);
  });
});

describe('PRX-02 STRICT_POS_PRICING prod', () => {
  it('est strict quand NODE_ENV=production', () => {
    const prevStrict = process.env.STRICT_POS_PRICING;
    const prevApp = process.env.APP_ENV;
    const prevLocal = process.env.LOCAL_DEV;
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STRICT_POS_PRICING', '');
    vi.stubEnv('APP_ENV', '');
    vi.stubEnv('LOCAL_DEV', '');
    delete process.env.STRICT_POS_PRICING;
    delete process.env.APP_ENV;
    delete process.env.LOCAL_DEV;
    expect(isStrictPosPricing()).toBe(true);
    vi.unstubAllEnvs();
    if (prevStrict !== undefined) process.env.STRICT_POS_PRICING = prevStrict;
    if (prevApp !== undefined) process.env.APP_ENV = prevApp;
    if (prevLocal !== undefined) process.env.LOCAL_DEV = prevLocal;
  });
});
