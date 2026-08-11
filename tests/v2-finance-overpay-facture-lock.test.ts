/**
 * V2-06b — Overpay sur update paiement + guard facture (purs / source).
 * Aucune écriture DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commandeRemainingAmount, paidTotal } from '@/lib/server/modules/paiements/paiements.repository';
import { assertCommandeBillable } from '@/lib/commande/facture-snapshot-guard';

const root = process.cwd();

function readSrc(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('V2-06b — update paiement overpay (exclude self)', () => {
  it('reste commande ignore le paiement en cours de modification', () => {
    const payments = [
      { id: 'p1', montant: 40_000, type: 'Acompte' },
      { id: 'p2', montant: 30_000, type: 'Solde' },
    ];
    const others = payments.filter((p) => p.id !== 'p2');
    expect(commandeRemainingAmount(100_000, others)).toBe(60_000);
    expect(commandeRemainingAmount(100_000, payments)).toBe(30_000);
  });

  it('facture : paidTotal hors self autorise hausse jusqu’au TTC', () => {
    const paiements = [
      { id: 'a', montant: 50_000, type: 'Acompte' },
      { id: 'b', montant: 20_000, type: 'Solde' },
    ];
    const others = paiements.filter((p) => p.id !== 'b');
    const reste = 100_000 - paidTotal(others);
    expect(reste).toBe(50_000);
    expect(45_000 > reste + 1).toBe(false);
    expect(52_000 > reste + 1).toBe(true);
  });

  it('updatePaiementRecord re-check overpay en excluant l’id courant', () => {
    const src = readSrc('lib/server/modules/paiements/paiements.service.ts');
    expect(src).toMatch(/export async function updatePaiementRecord/);
    expect(src).toMatch(/others\.filter\(\(p\) => p\.id !== id\)|existing\.filter\(\(p\) => p\.id !== id\)/);
    expect(src).toMatch(/OVERPAY_CMD|OVERPAY/);
  });
});

describe('V2-06b — ensureFacture + Emise lock', () => {
  it('assertCommandeBillable refuse snapshot manquant', () => {
    const r = assertCommandeBillable({
      id: 'c1',
      numero: 'CMD-1',
      configSnapshot: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('SNAPSHOT_MISSING');
  });

  it('ensureFactureForCommande appelle assertCommandeBillable', () => {
    const src = readSrc('lib/services/facture-workflow-service.ts');
    expect(src).toMatch(/assertCommandeBillable/);
    expect(src).toMatch(/export async function ensureFactureForCommande/);
  });

  it('updateFacture verrouille meta Emise / Partiellement_payee', () => {
    const src = readSrc('lib/server/modules/factures/factures.service.ts');
    expect(src).toMatch(/FactureStatut\.Emise/);
    expect(src).toMatch(/Partiellement_payee/);
    expect(src).toMatch(/touchesMeta/);
  });
});
