import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRODUCTION_FLUX_STEPS,
  healCustomStepsForPlanning,
  pickPlanningEtapes,
  prepareNewFluxStep,
  buildDefaultProductionFluxConfig,
  type ProductionFluxStep,
} from '@/lib/data/production-flux-config';

function customStep(overrides: Partial<ProductionFluxStep> = {}): ProductionFluxStep {
  return {
    id: 'step-andrana',
    code: 'andrana',
    name: 'andrana',
    description: '',
    responsibleRole: 'designer',
    linkedModules: ['commande'],
    targetDelayHours: 8,
    active: false,
    required: true,
    visiblePlanning: false,
    generatesTask: false,
    requiresValidation: false,
    blocksNext: false,
    commandeStatut: null,
    taskType: null,
    planningResource: null,
    sortOrder: 14,
    ...overrides,
  };
}

describe('Planning Gantt ↔ Production & Flux', () => {
  it('liste les 14 étapes par défaut (toute la chaîne)', () => {
    const etapes = pickPlanningEtapes(DEFAULT_PRODUCTION_FLUX_STEPS);
    expect(etapes).toHaveLength(14);
    expect(etapes.map((e) => e.name)).toContain('Client');
    expect(etapes.map((e) => e.name)).toContain('Impression');
  });

  it('ajoute une étape custom inactive dans le Gantt (andrana = 15e)', () => {
    const etapes = pickPlanningEtapes([...DEFAULT_PRODUCTION_FLUX_STEPS, customStep()]);
    expect(etapes).toHaveLength(15);
    expect(etapes.at(-1)?.name).toBe('andrana');
  });

  it('retire une étape supprimée du Gantt', () => {
    const withoutLivraison = DEFAULT_PRODUCTION_FLUX_STEPS.filter((s) => s.id !== 'livraison');
    const etapes = pickPlanningEtapes(withoutLivraison);
    expect(etapes).toHaveLength(13);
    expect(etapes.map((e) => e.name)).not.toContain('Livraison');
  });

  it('active + Planning une nouvelle étape (designer → graphisme)', () => {
    const prepared = prepareNewFluxStep(customStep());
    expect(prepared.active).toBe(true);
    expect(prepared.visiblePlanning).toBe(true);
    expect(prepared.generatesTask).toBe(true);
    expect(prepared.linkedModules).toEqual(expect.arrayContaining(['planning', 'taches']));
    expect(prepared.taskType).toBe('graphisme');
    expect(prepared.planningResource).toBe('andrana');
  });

  it('guérit les étapes custom déjà en base (inactives → Gantt)', () => {
    const config = buildDefaultProductionFluxConfig();
    config.steps.push(customStep());
    const healed = healCustomStepsForPlanning(config);
    expect(healed.changed).toBe(true);
    const andrana = healed.config.steps.find((s) => s.id === 'step-andrana');
    expect(andrana?.active).toBe(true);
    expect(andrana?.visiblePlanning).toBe(true);
    expect(andrana?.generatesTask).toBe(true);
    expect(pickPlanningEtapes(healed.config.steps)).toHaveLength(15);
  });

  it('ne réactive pas une étape custom déjà branchée au Planning', () => {
    const config = buildDefaultProductionFluxConfig();
    config.steps.push(customStep({ active: false, visiblePlanning: true }));
    const healed = healCustomStepsForPlanning(config);
    expect(healed.changed).toBe(false);
    expect(healed.config.steps.find((s) => s.id === 'step-andrana')?.active).toBe(false);
    expect(pickPlanningEtapes(healed.config.steps)).toHaveLength(15);
  });
});
