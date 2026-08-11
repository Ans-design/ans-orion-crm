/**
 * Lot maître — B-01…B-05 : enveloppe { ok, data } déwrappée (caractérisation).
 */
import { describe, expect, it } from 'vitest';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';

describe('B-01…B-05 unwrapApiData contrats', () => {
  it('B-01 messaging upload → attachments[]', () => {
    const body = { ok: true as const, data: { attachments: [{ id: 'a1' }, { id: 'a2' }] } };
    const d = unwrapApiData<{ attachments: { id: string }[] }>(body);
    expect(d.attachments.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('B-02 create-from-order → conv.id', () => {
    const body = { ok: true as const, data: { id: 'conv-9', name: 'CMD-1' } };
    const conv = unwrapApiData<{ id: string }>(body);
    expect(conv.id).toBe('conv-9');
  });

  it('B-03 stock GET [id] → sku/quantity', () => {
    const body = { ok: true as const, data: { sku: 'SKU-1', label: 'Papier', quantity: 10, reservedQty: 2 } };
    const s = unwrapApiData<{ sku: string; quantity: number; reservedQty: number }>(body);
    expect(s.sku).toBe('SKU-1');
    expect(s.quantity - s.reservedQty).toBe(8);
  });

  it('B-04 reports → paiementsByMode', () => {
    const body = {
      ok: true as const,
      data: { caEncaisse: 1000, paiementsByMode: { Espèces: 500, MVola: 500 } },
    };
    const sales = unwrapApiData<{ caEncaisse: number; paiementsByMode: Record<string, number> }>(body);
    expect(sales.caEncaisse).toBe(1000);
    expect(Object.keys(sales.paiementsByMode)).toHaveLength(2);
  });

  it('B-05 paiements/batch → receiptNum', () => {
    const body = { ok: true as const, data: { receiptNum: 'RCP-42', total: 25000 } };
    const data = unwrapApiData<{ receiptNum: string; total: number }>(body);
    expect(data.receiptNum).toBe('RCP-42');
    expect(data.total).toBe(25000);
  });

  it('legacy flat body reste compatible', () => {
    expect(unwrapApiData<{ id: string }>({ id: 'flat' }).id).toBe('flat');
  });

  it('erreur enveloppe → message utilisateur', () => {
    expect(
      getApiErrorMessage({ ok: false, error: { message: 'Permission insuffisante', code: 'FORBIDDEN' } }),
    ).toBe('Permission insuffisante');
  });
});
