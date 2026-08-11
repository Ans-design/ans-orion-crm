import { describe, expect, it } from 'vitest';
import { FM_PARAMETERS, FM_RULES } from '@/lib/pricing/formules-moteurs-catalog';
import {
  FM_STANDARD_RULES_FAMILY,
  buildLiveParamOverrides,
  buildTruthParameters,
  consolidateBusinessRules,
  mergeLiveRules,
  resolveParamDisplayValue,
  stripCalcOverrides,
  type FmLiveSyncPayload,
  type FmTruthRule,
} from '@/lib/pricing/formules-moteurs-live-sync';

const sampleLive: FmLiveSyncPayload = {
  ok: true,
  source: 'database',
  updatedAt: new Date().toISOString(),
  paperFormats: [
    { formatCode: 'A4', ratioA4: 1, active: true },
    { formatCode: 'A5', ratioA4: 0.5, active: true },
  ],
  pricingVariables: [
    { code: 'tva_default', value: '20', active: true },
    { code: 'face_recto_verso_mult', value: '1.8', label: 'Mult RV', active: true },
  ],
  businessRules: [
    {
      ruleKey: 'FLY-01',
      ruleName: 'A4 RV only (DB)',
      ruleType: 'validation',
      family: 'Flyers',
      message: 'Bloquer recto seul',
      active: true,
    },
    {
      ruleKey: 'NEW-DB-01',
      ruleName: 'Règle uniquement DB',
      ruleType: 'compatibility',
      family: 'Papiers',
      message: 'Alerte',
      active: true,
    },
  ],
  supportFaces: [
    {
      supportKey: 'pvc-translucide',
      supportName: 'PVC translucide',
      rectoAllowed: true,
      versoAllowed: false,
      rectoVersoAllowed: false,
      active: true,
    },
  ],
  tiersPos: [
    { minQty: 1, maxQty: 9, discountPercent: 0 },
    { minQty: 10, maxQty: 39, discountPercent: 10 },
  ],
  tiersUniversal: [
    { minQty: 1, maxQty: 49, discountPercent: 0 },
    { minQty: 50, maxQty: 99, discountPercent: 10 },
  ],
  counts: {
    paperFormats: 2,
    pricingVariables: 2,
    businessRules: 2,
    supportFaces: 1,
    paramsLive: 0,
    rulesLive: 2,
    tiersPos: 2,
    tiersUniversal: 2,
  },
};

describe('formules-moteurs-live-sync truth', () => {
  it('maps formats, tax and tiers into live overrides', () => {
    const overrides = buildLiveParamOverrides(sampleLive);
    expect(overrides['format-a4']).toBe('1');
    expect(overrides['format-a5']).toBe('0.5');
    expect(overrides.tax).toBe('20');
    expect(overrides['tier-p0']).toContain('1–9');
    expect(overrides['tier-u1']).toContain('−10 %');
  });

  it('prefers live DB over catalog, session dirty over live', () => {
    const param = FM_PARAMETERS.find((p) => p.key === 'format-a5')!;
    const live = buildLiveParamOverrides(sampleLive);
    const fromLive = resolveParamDisplayValue(param, {}, live);
    expect(fromLive.value).toBe('0.5');
    expect(fromLive.meta.isTruth).toBe(true);

    const dirty = resolveParamDisplayValue(param, { 'format-a5': '0.55' }, live);
    expect(dirty.value).toBe('0.55');
    expect(dirty.meta.isTruth).toBe(false);
    expect(dirty.meta.liveSource).toBe('session');
  });

  it('strips calc-affecting localStorage overrides', () => {
    expect(
      stripCalcOverrides({
        tax: '99',
        'format-a4': '9',
        'tier-u0': 'fake',
        uiNote: 'keep',
      }),
    ).toEqual({ uiNote: 'keep' });
  });

  it('buildTruthParameters marks live rows and injects support faces', () => {
    const rows = buildTruthParameters(FM_PARAMETERS, sampleLive, {});
    const a5 = rows.find((p) => p.key === 'format-a5');
    expect(a5?.truth.isTruth).toBe(true);
    expect(a5?.value).toBe('0.5');
    expect(rows.some((p) => p.key?.startsWith('face-') && p.truth.isTruth)).toBe(true);
    expect(rows.some((p) => p.key === 'face_recto_verso_mult' && p.truth.isTruth)).toBe(true);
  });

  it('merges rules with isTruth for DB rows', () => {
    const merged = mergeLiveRules(FM_RULES, sampleLive.businessRules);
    expect(merged.length).toBeGreaterThanOrEqual(FM_RULES.length);
    expect(merged.find((r) => r.code.toUpperCase() === 'FLY-01')?.isTruth).toBe(true);
    expect(merged.find((r) => r.code === 'NEW-DB-01')?.isTruth).toBe(true);
    expect(merged.filter((r) => !r.isTruth).length).toBeGreaterThan(0);
  });

  it('ne perd pas les règles DB sans ruleKey', () => {
    const merged = mergeLiveRules(FM_RULES, [
      {
        ruleKey: '',
        ruleName: 'Grammage papier partagé',
        ruleType: 'alert',
        family: 'Papiers',
        message: 'Grammages standardisés',
        active: true,
      },
      {
        ruleKey: '   ',
        ruleName: 'Ordre de configuration',
        ruleType: 'info',
        family: 'Synchronisation',
        message: 'Parcours identique',
        active: true,
      },
    ]);
    const truth = merged.filter((r) => r.isTruth);
    expect(truth.length).toBeGreaterThanOrEqual(2);
    expect(truth.every((r) => r.code.startsWith('DB-') || r.code.length > 0)).toBe(true);
  });

  it('fusionne les templates multi-articles en règles standard', () => {
    const raw: FmTruthRule[] = [
      {
        code: 'fly-std-format-force-price',
        family: 'Flyers',
        rule: 'Prix forcé format perso',
        action: 'Applique un prix forcé',
        severity: 'block',
        source: 'database',
        isTruth: true,
      },
      {
        code: 'cv-std-format-force-price',
        family: 'Cartes de visite',
        rule: 'Prix forcé format perso',
        action: 'Applique un prix forcé',
        severity: 'block',
        source: 'database',
        isTruth: true,
      },
      {
        code: 'aff-std-format-force-price',
        family: 'Affiches',
        rule: 'Prix forcé format perso',
        action: 'Applique un prix forcé',
        severity: 'warn',
        source: 'database',
        isTruth: true,
      },
      {
        code: 'FLY-UNIQUE',
        family: 'Flyers',
        rule: 'A4 RV only',
        action: 'Bloquer recto seul',
        severity: 'block',
        source: 'database',
        isTruth: true,
      },
    ];
    const out = consolidateBusinessRules(raw);
    expect(out.length).toBe(2);
    const std = out.find((r) => r.canonicalKey === 'tpl:force-price:format');
    expect(std?.scope).toBe('standard');
    expect(std?.family).toBe(FM_STANDARD_RULES_FAMILY);
    expect(std?.occurrenceCount).toBe(3);
    expect(std?.severity).toBe('block');
    expect(out.some((r) => r.code === 'FLY-UNIQUE' && r.scope === 'family')).toBe(true);
  });

  it('fusionne les idées textuelles identiques et classe Synchronisation en standard', () => {
    const raw: FmTruthRule[] = [
      {
        code: 'SYNC-02',
        family: 'Synchronisation',
        rule: 'Ordre de configuration standardisé',
        action: 'Parcours configurateur identique sur tous les articles',
        severity: 'info',
        source: 'database',
        isTruth: true,
      },
      {
        code: 'CFG-ORDRE',
        family: 'Général',
        rule: 'Ordre de configuration standardisé',
        action: 'Parcours configurateur identique sur tous les articles',
        severity: 'info',
        source: 'catalog',
        isTruth: false,
      },
      {
        code: 'TEX-01',
        family: 'Textile',
        rule: 'Technologie DTF',
        action: 'Option textile spécifique',
        severity: 'info',
        source: 'database',
        isTruth: true,
      },
    ];
    const out = consolidateBusinessRules(raw);
    expect(out.length).toBe(2);
    const shared = out.find((r) => r.scope === 'standard');
    expect(shared?.occurrenceCount).toBe(2);
    expect(shared?.family).toBe(FM_STANDARD_RULES_FAMILY);
    expect(out.find((r) => r.code === 'TEX-01')?.scope).toBe('family');
  });
});
