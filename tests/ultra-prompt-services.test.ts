import { describe, expect, it } from 'vitest';
import { buildCaByVille, buildClientsByVille } from '@/lib/dashboard/client-geography';
import { encodeDevisPaymentNote, extractDevisIdFromPaymentNotes } from '@/lib/services/devis-acompte-service';

describe('client-geography', () => {
  it('aggregates clients by ville', () => {
    const rows = buildClientsByVille([
      { ville: 'Antananarivo' },
      { ville: 'Antananarivo' },
      { ville: null },
    ]);
    expect(rows[0].name).toBe('Antananarivo');
    expect(rows[0].value).toBe(2);
  });

  it('aggregates CA by ville', () => {
    const rows = buildCaByVille([
      { total: 1000, client: { ville: 'Tana' } },
      { total: 500, client: { ville: 'Tana' } },
    ]);
    expect(rows[0].value).toBe(1500);
    expect(rows[0].count).toBe(2);
  });
});

describe('devis-acompte notes', () => {
  it('encodes and extracts devis id', () => {
    const note = encodeDevisPaymentNote('clxyz123', 'acompte client');
    expect(extractDevisIdFromPaymentNotes(note)).toBe('clxyz123');
  });
});
