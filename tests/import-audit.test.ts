import { describe, expect, it } from 'vitest';
import { buildAuditDiff, toAuditRecord } from '@/lib/server/audit/entity-snapshot';
import { previewImport } from '@/lib/server/modules/import/import.service';

describe('entity-snapshot', () => {
  it('detecte les champs modifies', () => {
    const before = { name: 'A', email: 'a@test.com', statut: 'Actif' };
    const after = { name: 'B', email: 'a@test.com', statut: 'Actif' };
    const diff = buildAuditDiff(before, after, ['name', 'email', 'statut'] as const);
    expect(diff.hasChanges).toBe(true);
    expect(diff.oldValue).toEqual({ name: 'A' });
    expect(diff.newValue).toEqual({ name: 'B' });
  });

  it('toAuditRecord ne garde que les champs suivis', () => {
    const row = { name: 'Telma', email: 'x@y.z', secret: 'hidden' };
    const picked = toAuditRecord(row, ['name', 'email'] as const);
    expect(picked).toMatchObject({ name: 'Telma', email: 'x@y.z' });
    expect(picked).not.toHaveProperty('secret');
  });
});

describe('import preview', () => {
  it('valide devis avec lignes', () => {
    const result = previewImport({
      type: 'devis',
      mode: 'merge',
      data: [{
        clientId: 'c1',
        lignes: [{ articleId: 'a1', articleLabel: 'Flyer', quantity: 100, prixUnitaireAuto: 500 }],
      }],
    });
    expect(result.validRows).toBe(1);
    expect(result.invalidRows).toBe(0);
  });

  it('valide paiement avec lien facture', () => {
    const result = previewImport({
      type: 'paiements',
      mode: 'merge',
      data: [{ montant: 5000, factureId: 'f1' }],
    });
    expect(result.validRows).toBe(1);
  });
});

describe('prisma-statut-bridge', () => {
  it('convertit label devis vers clé enum', async () => {
    const { devisStatutFromLabel, devisStatutToLabel } = await import('@/lib/server/data/prisma-statut-bridge');
    const { DevisStatut } = await import('@prisma/client');
    expect(devisStatutFromLabel('Accepté')).toBe(DevisStatut.Accepte);
    expect(devisStatutToLabel('Accepte')).toBe('Accepté');
  });
});

describe('enum-normalize', () => {
  it('normalise statut devis inconnu', async () => {
    const { normalizeDevisStatut } = await import('@/lib/server/data/enum-normalize');
    expect(normalizeDevisStatut('Accepté')).toBe('Accepté');
    expect(normalizeDevisStatut('foo')).toBe('Brouillon');
  });

  it('normalise statut facture', async () => {
    const { normalizeFactureStatut } = await import('@/lib/server/data/enum-normalize');
    expect(normalizeFactureStatut('Émise')).toBe('Émise');
    expect(normalizeFactureStatut('')).toBe('Brouillon');
  });
});

describe('prisma-statut-bridge commande', () => {
  it('convertit label commande vers enum', async () => {
    const { commandeStatutFromLabel, commandeStatutToLabel } = await import('@/lib/server/data/prisma-statut-bridge');
    const { CommandeStatut } = await import('@prisma/client');
    expect(commandeStatutFromLabel('À planifier')).toBe(CommandeStatut.A_planifier);
    expect(commandeStatutToLabel('Livre')).toBe('Livré');
    expect(commandeStatutFromLabel('Livrée')).toBe(CommandeStatut.Livre);
  });
});

describe('prisma-statut-bridge client', () => {
  it('convertit label client vers enum', async () => {
    const {
      clientStatutFromLabel,
      clientStatutLabel,
      clientStatutFromCategorie,
      fideleClientStatuts,
    } = await import('@/lib/server/data/prisma-statut-bridge');
    const { ClientStatut } = await import('@prisma/client');
    expect(clientStatutFromLabel('Archivé')).toBe(ClientStatut.Archive);
    expect(clientStatutLabel(ClientStatut.Archive)).toBe('Archivé');
    expect(clientStatutFromCategorie('Prospect')).toBe(ClientStatut.Prospect);
    expect(fideleClientStatuts()).toEqual([ClientStatut.VIP, ClientStatut.Premium]);
  });
});

describe('payment snapshot', () => {
  it('calcule statut soldé', async () => {
    const { buildPaymentSnapshot } = await import('@/lib/server/modules/snapshots/snapshot.service');
    const snap = buildPaymentSnapshot(10000, 10000, { mode: 'Espèces', reference: null });
    expect(snap.paymentStatus).toBe('soldé');
    expect(snap.resteAPayer).toBe(0);
  });
});
