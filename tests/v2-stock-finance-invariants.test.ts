/**
 * V2-05 — Invariants stock (purs) + V2-06 finance (purs).
 * Aucune écriture DB.
 */
import { describe, expect, it } from 'vitest';
import {
  assertDebitAllowed,
  computeReservedAfterRelease,
  simulateConcurrentDebits,
  stockAvailable,
} from '@/lib/services/stock-quantity';
import {
  aggregateCashTotals,
  extractSessionIdFromPaymentNotes,
} from '@/lib/services/cash-session';
import { htToTtcMga, roundMga } from '@/lib/pricing/mga-round';
import { normalizeDevisStatut } from '@/lib/server/data/enum-normalize';

describe('V2-05 — débit / concurrence / release', () => {
  it('assertDebitAllowed refuse oversell et stock réservé', () => {
    expect(() =>
      assertDebitAllowed({ quantity: 5, reservedQty: 0 }, 6),
    ).toThrow(/insuffisant/i);
    expect(() =>
      assertDebitAllowed({ quantity: 10, reservedQty: 8, unit: 'u' }, 3),
    ).toThrow(/insuffisant/i);
    expect(() =>
      assertDebitAllowed({ quantity: 10, reservedQty: 2 }, 5),
    ).not.toThrow();
  });

  it('deux ventes du dernier article → un seul succès', () => {
    const r = simulateConcurrentDebits(1, [1, 1]);
    expect(r.successes).toBe(1);
    expect(r.failures).toBe(1);
    expect(r.remaining).toBe(0);
  });

  it('computeReservedAfterRelease', () => {
    expect(computeReservedAfterRelease(10, 4)).toBe(6);
    expect(computeReservedAfterRelease(3, 10)).toBe(0);
    expect(stockAvailable({ quantity: 10, reservedQty: computeReservedAfterRelease(8, 8) })).toBe(10);
  });
});

describe('V2-06 — caisse agrégation + MGA facture', () => {
  it('extractSessionIdFromPaymentNotes', () => {
    expect(extractSessionIdFromPaymentNotes(JSON.stringify({ sessionId: 'sess-1' }))).toBe('sess-1');
    expect(extractSessionIdFromPaymentNotes('texte libre')).toBeNull();
  });

  it('aggregateCashTotals ignore autres sessions via filtre amont', () => {
    const all = [
      { montant: 1000, mode: 'Espèces', notes: JSON.stringify({ sessionId: 'A' }) },
      { montant: 5000, mode: 'Espèces', notes: JSON.stringify({ sessionId: 'B' }) },
      { montant: 2000, mode: 'MVola', notes: JSON.stringify({ sessionId: 'A' }) },
    ];
    const scoped = all.filter(
      (p) => extractSessionIdFromPaymentNotes(p.notes) === 'A',
    );
    const totals = aggregateCashTotals(scoped);
    expect(totals.especes).toBe(1000);
    expect(totals.mvola).toBe(2000);
  });

  it('facture HT/TTC arrondis Ariary', () => {
    const sousTotal = 10_001;
    const totalHT = roundMga(sousTotal);
    expect(htToTtcMga(totalHT, 20)).toBe(12_001);
  });
});

describe('V2-06 — devis Accepté normalisé', () => {
  it('normalizeDevisStatut Accepté', () => {
    expect(normalizeDevisStatut('Accepté')).toBe('Accepté');
  });
});
