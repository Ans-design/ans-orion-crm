import { describe, expect, it } from 'vitest';
import { getAcompteRatioFromDevisNotes, getRequiredAcompteAmount } from '@/lib/devis/acompte-threshold';
import { serializeDevisNotes } from '@/lib/devis-meta';
import { encodeDevisPaymentNote } from '@/lib/services/devis-acompte-service';

describe('acompte-threshold', () => {
  it('default ratio is 30%', () => {
    expect(getAcompteRatioFromDevisNotes(null)).toBe(0.3);
    expect(getRequiredAcompteAmount({ totalTTC: 100000, notes: null })).toBe(30000);
  });

  it('reads avancePct from devis meta', () => {
    const notes = serializeDevisNotes({ modePaiement: 'Avance', avancePct: 50 });
    expect(getAcompteRatioFromDevisNotes(notes)).toBe(0.5);
    expect(getRequiredAcompteAmount({ totalTTC: 100000, notes })).toBe(50000);
  });
});

describe('devis payment notes', () => {
  it('encodes devis id in payment note', () => {
    expect(encodeDevisPaymentNote('abc123')).toBe('__devis:abc123');
  });
});
