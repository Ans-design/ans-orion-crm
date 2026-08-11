/**
 * VF-QA01 — Preuves comportementales (pas de scan regex seul).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { htToTtcMga, roundMga, ttcToHtMga } from '@/lib/pricing/mga-round';
import {
  assertDebitAllowed,
  computeReservedAfterRelease,
  computeStockAfterReservationConsume,
  stockAvailable,
} from '@/lib/services/stock-quantity';
import { computeWindowedSlice } from '@/lib/hooks/use-windowed-rows';
import { getApiErrorMessage } from '@/lib/api-client';
import { ROLE_PROFILES } from '@/lib/modules/role-registry';

const root = process.cwd();

describe('VF-QA01 — fiscalité MGA comportementale', () => {
  it('HT→TTC 20 % arrondi Ariary', () => {
    expect(htToTtcMga(100_000, 20)).toBe(120_000);
    expect(htToTtcMga(33_333, 20)).toBe(40_000);
  });

  it('TTC→HT cohérent avec round-trip arrondi', () => {
    const ht = 250_000;
    const ttc = htToTtcMga(ht, 20);
    expect(ttcToHtMga(ttc, 20)).toBe(ht);
  });

  it('roundMga refuse les non-finis', () => {
    expect(roundMga(Number.NaN)).toBe(0);
    expect(roundMga(12.4)).toBe(12);
    expect(roundMga(12.6)).toBe(13);
  });
});

describe('VF-QA01 — stock invariants purs', () => {
  it('disponible = physique − réservé', () => {
    expect(stockAvailable({ quantity: 100, reservedQty: 40 })).toBe(60);
    expect(stockAvailable({ quantity: 10, reservedQty: 50 })).toBe(0);
  });

  it('refuse un débit > disponible', () => {
    expect(() =>
      assertDebitAllowed({ quantity: 10, reservedQty: 3, unit: 'pcs' }, 8),
    ).toThrow(/insuffisant/i);
  });

  it('consommation réservation débite physique + réservé', () => {
    expect(
      computeStockAfterReservationConsume({ quantity: 50, reservedQty: 20 }, 10),
    ).toEqual({ quantity: 40, reservedQty: 10 });
  });

  it('libération de réservation borne à 0', () => {
    expect(computeReservedAfterRelease(5, 10)).toBe(0);
    expect(computeReservedAfterRelease(12, 4)).toBe(8);
  });
});

describe('VF-QA01 — virtualisation réelle', () => {
  it('sous le seuil : pas de virtualisation', () => {
    const rows = Array.from({ length: 20 }, (_, i) => i);
    const slice = computeWindowedSlice(rows, {
      scrollTop: 0,
      clientHeight: 400,
      threshold: 60,
    });
    expect(slice.virtualized).toBe(false);
    expect(slice.windowRows).toHaveLength(20);
  });

  it('au-dessus du seuil : fenêtre + spacers', () => {
    const rows = Array.from({ length: 200 }, (_, i) => i);
    const slice = computeWindowedSlice(rows, {
      scrollTop: 880,
      clientHeight: 440,
      rowHeight: 44,
      threshold: 60,
      overscan: 8,
    });
    expect(slice.virtualized).toBe(true);
    expect(slice.startIndex).toBe(Math.max(0, Math.floor(880 / 44) - 8));
    expect(slice.windowRows.length).toBeGreaterThan(0);
    expect(slice.windowRows.length).toBeLessThan(200);
    expect(slice.topSpacerPx).toBe(slice.startIndex * 44);
    expect(slice.bottomSpacerPx).toBeGreaterThan(0);
  });
});

describe('VF-QA01 — erreurs API structurées', () => {
  it('extrait message depuis enveloppe { error: { message } }', () => {
    expect(
      getApiErrorMessage({ error: { message: 'Non autorisé', code: 'FORBIDDEN' } }, 'x'),
    ).toBe('Non autorisé');
  });

  it('extrait message string et fallback', () => {
    expect(getApiErrorMessage({ error: 'Boom' }, 'x')).toBe('Boom');
    expect(getApiErrorMessage({}, 'Erreur')).toBe('Erreur');
  });
});

describe('VF-QA01 — catalogue lecture sans merge inline', () => {
  it('getPosCatalogue ne déclenche plus les merges au read', () => {
    const src = readFileSync(join(root, 'lib/services/catalogue-service.ts'), 'utf8');
    const fnStart = src.indexOf('export async function getPosCatalogue');
    const nextExport = src.indexOf('\nexport ', fnStart + 10);
    const body = src.slice(fnStart, nextExport > 0 ? nextExport : undefined);
    expect(body).not.toMatch(/mergePhotoPrintArticles/);
    expect(body).not.toMatch(/mergeGrandFormatArticles/);
    expect(body).not.toMatch(/repairMisclassifiedPosCategories/);
    expect(src).toMatch(/export async function runPosCatalogueMaintenance/);
  });
});

describe('VF-QA01 — RBAC navigation finance', () => {
  it('rôle auth finance mappe le profil Finance', () => {
    expect(ROLE_PROFILES.finance.authRoles).toContain('finance');
    expect(ROLE_PROFILES.finance.authRoles).toContain('caisse');
  });
});

describe('VF-QA01 — garde deploy data-loss', () => {
  it('vercel-build refuse le repli data-loss sans opt-in', () => {
    const src = readFileSync(join(root, 'scripts/vercel-build.mjs'), 'utf8');
    expect(src).toMatch(/ALLOW_VERCEL_DB_PUSH_DATA_LOSS/);
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it('setup-production-db et neon-db-push sont opt-in', () => {
    expect(readFileSync(join(root, 'scripts/setup-production-db.mjs'), 'utf8')).toMatch(
      /ALLOW_PROD_DB_SETUP/,
    );
    expect(readFileSync(join(root, 'scripts/neon-db-push.mjs'), 'utf8')).toMatch(
      /ALLOW_NEON_DB_PUSH/,
    );
  });
});
