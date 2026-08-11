import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { simulateConcurrentDebits } from '@/lib/services/stock-quantity';

const root = process.cwd();

describe('Vague B — gardes concurrence', () => {
  it('accept devis : claim updateMany + garde commande existante', () => {
    const src = readFileSync(join(root, 'lib/services/devis-accept-service.ts'), 'utf8');
    expect(src).toMatch(/commande\.findFirst/);
    expect(src).toMatch(/devisId/);
    expect(src).toMatch(/updateMany/);
    expect(src).toMatch(/statut:\s*\{\s*not:\s*DevisStatut\.Accepte/);
    expect(src).toMatch(/claim\.count === 0/);
  });

  it('stock sortie/réserve : UPDATE conditionnel disponible', () => {
    const src = readFileSync(join(root, 'lib/services/stock-service.ts'), 'utf8');
    expect(src).toMatch(/UPDATE StockItem/);
    expect(src).toMatch(/quantity - COALESCE\(reservedQty/);
    expect(src).toMatch(/reservedQty = COALESCE\(reservedQty/);
  });

  it('paiement : replay référence + catch race create', () => {
    const src = readFileSync(join(root, 'lib/server/modules/paiements/paiements.service.ts'), 'utf8');
    expect(src).toMatch(/existingByRef/);
    expect(src).toMatch(/Race concurrente/);
  });

  it('simulateConcurrentDebits : un seul succès si stock = intent', () => {
    const r = simulateConcurrentDebits(10, [10, 10]);
    expect(r.successes).toBe(1);
    expect(r.failures).toBe(1);
    expect(r.remaining).toBe(0);
  });
});
