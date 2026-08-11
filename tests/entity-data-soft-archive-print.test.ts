import { describe, expect, it } from 'vitest';
import {
  assertSoftDeleteAllowed,
  archivedListFilter,
  softArchiveData,
  softRestoreData,
  isLedgerProtectedEntity,
} from '@/lib/server/soft-archive';
import { ENTITY_EXCEL_MODULES, getEntityExcelModule } from '@/lib/crm/entity-excel-modules';
import {
  renderFactureHtml,
  renderFactureTicketHtml,
} from '@/lib/services/DocumentService';
import { resolveFacturePrintFormat } from '@/lib/services/facture-document-service';

describe('soft-archive helpers', () => {
  it('bloque hard-delete ledger', () => {
    expect(assertSoftDeleteAllowed('Facture').ok).toBe(false);
    expect(assertSoftDeleteAllowed('Client').ok).toBe(true);
    expect(isLedgerProtectedEntity('Paiement')).toBe(true);
  });

  it('filtre actifs / corbeille', () => {
    expect(archivedListFilter(false)).toEqual({ archived: false });
    expect(archivedListFilter(true)).toEqual({ archived: true });
  });

  it('produit tombstone archive / restore', () => {
    const a = softArchiveData('user-1');
    expect(a.archived).toBe(true);
    expect(a.archivedBy).toBe('user-1');
    expect(a.archivedAt).toBeInstanceOf(Date);
    expect(softRestoreData()).toEqual({
      archived: false,
      archivedAt: null,
      archivedBy: null,
    });
  });
});

describe('entity excel registry', () => {
  it('couvre CRM ops ledger RH', () => {
    const ids = ENTITY_EXCEL_MODULES.map((m) => m.id);
    expect(ids).toContain('clients');
    expect(ids).toContain('devis');
    expect(ids).toContain('stock-items');
    expect(ids).toContain('commandes');
    expect(ids).toContain('employees');
  });

  it('interdit import ledger', () => {
    expect(getEntityExcelModule('commandes')?.allowImport).toBe(false);
    expect(getEntityExcelModule('factures')?.allowImport).toBe(false);
    expect(getEntityExcelModule('paiements')?.allowImport).toBe(false);
    expect(getEntityExcelModule('clients')?.allowImport).toBe(true);
  });
});

describe('facture printFormat ticket vs facture', () => {
  const payload = {
    numero: 'FAC-2026-001',
    statut: 'Émise',
    dateEmission: new Date('2026-06-01'),
    sousTotal: 100000,
    remise: 0,
    tva: 20,
    totalHT: 100000,
    totalTTC: 120000,
    printFormat: 'ticket' as const,
    client: { name: 'Client Test', nif: 'NIF-123', statNumber: 'STAT-9' },
    lignes: [
      { description: 'Flyer', qty: 500, pu: 200, total: 100000 },
    ],
    paiements: [{ montant: 50000, mode: 'Espèces', type: 'Acompte' }],
  };

  it('resolveFacturePrintFormat', () => {
    expect(resolveFacturePrintFormat('ticket')).toBe('ticket');
    expect(resolveFacturePrintFormat('facture')).toBe('facture');
    expect(resolveFacturePrintFormat(undefined)).toBe('facture');
  });

  it('ticket HTML contient totaux et n° sans NIF lourd', () => {
    const html = renderFactureTicketHtml(payload as never, { forPdf: true });
    expect(html).toContain('FAC-2026-001');
    expect(html).toContain('120');
    expect(html.toLowerCase()).toMatch(/ticket|reçu|recu/);
  });

  it('facture HTML contient identité fiscale', () => {
    const html = renderFactureHtml({ ...payload, printFormat: 'facture' } as never, { forPdf: true });
    expect(html).toContain('FAC-2026-001');
    expect(html).toMatch(/NIF|STAT|nif|stat/i);
  });
});
