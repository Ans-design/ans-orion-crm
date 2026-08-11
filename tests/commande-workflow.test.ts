import { describe, expect, it } from 'vitest';
import {
  buildCommandeWorkflowSnapshot,
  getAllowedStatutTransitions,
  resolveWorkflowJalonIndex,
  validateCommandeStatutTransition,
  validateJalonAdvance,
  type CommandeWorkflowContext,
} from '@/lib/workflow/commande-workflow';

function baseCtx(overrides: Partial<CommandeWorkflowContext> = {}): CommandeWorkflowContext {
  return {
    statut: 'À planifier',
    avancement: 10,
    total: 100000,
    acompte: 0,
    reste: 100000,
    requiredAcompteRatio: 0.3,
    batValides: 0,
    totalBat: 0,
    fichiersCount: 0,
    hasDossierProduction: false,
    tachesCount: 0,
    qualiteValidee: false,
    incidentsOuverts: 0,
    stockReady: true,
    stockBlockers: [],
    ...overrides,
  };
}

describe('commande-workflow', () => {
  it('autorise transitions métier standard', () => {
    expect(getAllowedStatutTransitions('À planifier')).toContain('En production');
    expect(getAllowedStatutTransitions('En production')).toContain('En finition');
    expect(getAllowedStatutTransitions('Livré')).toEqual([]);
  });

  it('bloque production sans acompte ni BAT', () => {
    const r = validateCommandeStatutTransition('À planifier', 'En production', baseCtx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('ACOMPTE_INSUFFISANT');
  });

  it('autorise production avec acompte 50% et BAT validé', () => {
    const ctx = baseCtx({ acompte: 50000, batValides: 1, fichiersCount: 1 });
    const r = validateCommandeStatutTransition('À planifier', 'En production', ctx);
    expect(r.ok).toBe(true);
  });

  it('bloque livraison si reste impayé', () => {
    const ctx = baseCtx({ statut: 'Prête', avancement: 90, reste: 20000, acompte: 80000 });
    const r = validateCommandeStatutTransition('Prête', 'Livré', ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('RESTE_IMPAYE');
  });

  it('force bypass les garde-fous', () => {
    const r = validateCommandeStatutTransition('À planifier', 'En production', baseCtx(), { force: true });
    expect(r.ok).toBe(true);
  });

  it('valide avancement jalon suivant', () => {
    const ctx = baseCtx({ avancement: 10, acompte: 50000, batValides: 1 });
    const r = validateJalonAdvance('bat_envoye', ctx);
    expect(r.ok).toBe(true);
  });

  it('refuse jalon déjà atteint', () => {
    const ctx = baseCtx({ avancement: 30 });
    const r = validateJalonAdvance('validation_client', ctx);
    expect(r.ok).toBe(false);
  });

  it('bloque production sans stock réservé', () => {
    const ctx = baseCtx({
      acompte: 50000,
      batValides: 1,
      stockReady: false,
      stockBlockers: ['Vinyle : stock insuffisant'],
    });
    const r = validateCommandeStatutTransition('À planifier', 'En production', ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('STOCK_INSUFFISANT');
  });

  it('bloque prêt à livrer sans contrôle qualité', () => {
    const ctx = baseCtx({
      statut: 'En finition',
      avancement: 75,
      acompte: 50000,
      batValides: 1,
      reste: 0,
    });
    const r = validateCommandeStatutTransition('En finition', 'Prête', ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('QUALITE_REQUISE');
  });

  it('autorise prêt à livrer avec qualité validée', () => {
    const ctx = baseCtx({
      statut: 'En finition',
      avancement: 75,
      acompte: 50000,
      batValides: 1,
      reste: 0,
      qualiteValidee: true,
    });
    const r = validateCommandeStatutTransition('En finition', 'Prête', ctx);
    expect(r.ok).toBe(true);
  });

  it('snapshot liste les blockers', () => {
    const snap = buildCommandeWorkflowSnapshot(baseCtx());
    expect(snap.blockers.length).toBeGreaterThan(0);
    expect(snap.nextJalon?.label).toBe('BAT envoyé');
  });

  it('résout l’index jalon pour le rail UI', () => {
    expect(
      resolveWorkflowJalonIndex({ currentJalonId: 'en_impression', progressPercent: 10 }),
    ).toBe(4);
    expect(resolveWorkflowJalonIndex({ progressPercent: 5 })).toBe(0);
    expect(resolveWorkflowJalonIndex({ progressPercent: 90 })).toBeGreaterThan(0);
  });
});
