import { describe, expect, it } from 'vitest';
import {
  buildDgiExportLines,
  dgiLinesToCsv,
  paymentAccountForMode,
  SYSCOHADA_ACCOUNTS,
} from '@/lib/finance/comptable-dgi-export';

describe('comptable DGI export', () => {
  it('génère écritures facture client / ventes / TVA', () => {
    const lines = buildDgiExportLines(
      [{
        numero: 'FAC-001',
        createdAt: new Date('2026-06-01'),
        totalHT: 100_000,
        totalTTC: 120_000,
        tva: 20,
        client: { name: 'Client Test', code: 'CLI001', nif: 'NIF123' },
      }],
      [],
    );
    expect(lines.some((l) => l.compte === SYSCOHADA_ACCOUNTS.clients && l.debit === 120_000)).toBe(true);
    expect(lines.some((l) => l.compte === SYSCOHADA_ACCOUNTS.ventesServices && l.credit === 100_000)).toBe(true);
    expect(lines.some((l) => l.compte === SYSCOHADA_ACCOUNTS.tvaCollectee && l.credit === 20_000)).toBe(true);
  });

  it('génère écritures encaissement caisse', () => {
    const lines = buildDgiExportLines([], [{
      numero: 'PAY-001',
      datePaiement: new Date('2026-06-02'),
      montant: 50_000,
      mode: 'Espèces',
      type: 'Acompte',
      client: { name: 'Client Test', code: 'CLI001' },
    }]);
    expect(lines.some((l) => l.compte === SYSCOHADA_ACCOUNTS.caisse && l.debit === 50_000)).toBe(true);
    expect(lines.some((l) => l.compte === SYSCOHADA_ACCOUNTS.clients && l.credit === 50_000)).toBe(true);
  });

  it('utilise compte mobile money pour Mvola', () => {
    expect(paymentAccountForMode('Mvola')).toBe(SYSCOHADA_ACCOUNTS.mobileMoney);
    expect(paymentAccountForMode('Virement')).toBe(SYSCOHADA_ACCOUNTS.banque);
  });

  it('inclut disclaimer NON CERTIFIE DGI', () => {
    const csv = dgiLinesToCsv([], { from: '2026-01-01', to: '2026-01-31' });
    expect(csv).toContain('NON CERTIFIE DGI');
    expect(csv).toContain('Compte;Libelle;Date');
  });
});
