import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasBatValide, buildCommandeWorkflowSnapshot } from '@/lib/workflow/commande-workflow';
import type { CommandeWorkflowContext } from '@/lib/workflow/commande-workflow';
import { getNextAction } from '@/lib/flow/next-action';

const root = process.cwd();

function baseCtx(partial: Partial<CommandeWorkflowContext>): CommandeWorkflowContext {
  return {
    statut: 'À planifier',
    avancement: 10,
    total: 100_000,
    acompte: 50_000,
    reste: 50_000,
    requiredAcompteRatio: 0.3,
    batValides: 0,
    totalBat: 0,
    fichiersCount: 1,
    hasDossierProduction: true,
    tachesCount: 1,
    qualiteValidee: false,
    incidentsOuverts: 0,
    stockReady: true,
    stockBlockers: [],
    ...partial,
  };
}

describe('Vague C — workflow canon', () => {
  it('BAT Verrouillé compté via isBatValidated dans loadCommandeWorkflowContext', () => {
    const src = readFileSync(join(root, 'lib/services/commande-workflow-service.ts'), 'utf8');
    expect(src).toMatch(/isBatValidated/);
    expect(src).toMatch(/findCommandeRelatedPaiements/);
    expect(src).toMatch(/paidTotal/);
  });

  it('hasBatValide : 0 proof = OK ; proof non validé = KO ; Verrouillé via batValides', () => {
    expect(hasBatValide(baseCtx({ totalBat: 0, batValides: 0 }))).toBe(true);
    expect(hasBatValide(baseCtx({ totalBat: 1, batValides: 0 }))).toBe(false);
    expect(hasBatValide(baseCtx({ totalBat: 1, batValides: 1 }))).toBe(true);
  });

  it('blocker acompte utilise requiredAcompteRatio (pas 50 % fixe)', () => {
    const snap = buildCommandeWorkflowSnapshot(
      baseCtx({ acompte: 0, requiredAcompteRatio: 0.3 }),
    );
    expect(snap.blockers.some((b) => b.includes('30 %'))).toBe(true);
    expect(snap.blockers.some((b) => b.includes('50 %'))).toBe(false);
  });

  it('CQ conforme : étape puis transition Prête', () => {
    const src = readFileSync(join(root, 'lib/services/qualite-service.ts'), 'utf8');
    expect(src).toMatch(/updateDossierEtape/);
    expect(src).toMatch(/transitionCommandeStatut\(commandeId, 'Prête'/);
  });

  it('livraison créée ne force pas Prête depuis En production', () => {
    const src = readFileSync(join(root, 'lib/services/commande-module-sync.ts'), 'utf8');
    expect(src).toMatch(/statut === 'En finition'/);
    expect(src).toMatch(/statut === 'Prête' \|\| statut === 'Livré'/);
  });

  it('getNextAction commande conserve deep links modules', () => {
    const a = getNextAction({
      entity: 'commande',
      status: 'Prête',
      entityId: 'cmd-1',
    });
    expect(a?.href).toMatch(/commande=cmd-1/);
  });
});
