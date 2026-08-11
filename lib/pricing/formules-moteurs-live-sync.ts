/**
 * Sync Formules & moteurs ↔ sources de vérité DB.
 * Affichage « vrai » : live DB > dirty session > catalogue (doc uniquement).
 */

import type {
  FmParameter,
  FmParamStatus,
  FmRule,
  FmRuleSeverity,
} from '@/lib/pricing/formules-moteurs-catalog';

export const FM_FORMAT_KEY_TO_CODE: Record<string, string> = {
  'format-a6': 'A6',
  'format-dl': 'DL',
  'format-a5': 'A5',
  'format-b5': 'B5',
  'format-a4': 'A4',
  'format-a3': 'A3',
  'format-a2': 'A2',
  'format-a1': 'A1',
  'format-a0': 'A0',
};

/** Clé FM → code PricingVariable global. */
export const FM_PARAM_TO_VARIABLE: Record<string, string> = {
  tax: 'tva_default',
};

/** Paliers universels / POS → index dans les grilles volume live. */
export const FM_TIER_UNIVERSAL_KEYS = [
  'tier-u0',
  'tier-u1',
  'tier-u2',
  'tier-u3',
  'tier-u4',
] as const;

export const FM_TIER_POS_KEYS = [
  'tier-p0',
  'tier-p1',
  'tier-p2',
  'tier-p3',
  'tier-p4',
] as const;

export type FmLivePaperFormat = {
  id?: string;
  formatCode: string;
  ratioA4: number;
  widthMm?: number;
  heightMm?: number;
  active?: boolean;
};

export type FmLivePricingVariable = {
  code: string;
  value: string;
  label?: string;
  active?: boolean;
};

export type FmLiveBusinessRule = {
  ruleKey: string;
  ruleName: string;
  ruleType: string;
  family?: string | null;
  message?: string | null;
  active?: boolean;
  connected?: boolean;
};

export type FmLiveSupportFace = {
  supportKey?: string;
  supportName?: string;
  rectoAllowed?: boolean;
  versoAllowed?: boolean;
  rectoVersoAllowed?: boolean;
  active?: boolean;
};

export type FmLiveVolumeTier = {
  minQty: number;
  maxQty: number | null;
  discountPercent: number;
};

export type FmLiveSyncPayload = {
  ok: boolean;
  source: 'database' | 'partial' | 'fallback';
  updatedAt: string;
  paperFormats: FmLivePaperFormat[];
  pricingVariables: FmLivePricingVariable[];
  businessRules: FmLiveBusinessRule[];
  supportFaces: FmLiveSupportFace[];
  /** Paliers volume génériques (profil POS / global). */
  tiersPos: FmLiveVolumeTier[];
  /** Paliers volume ISF / universel runtime. */
  tiersUniversal: FmLiveVolumeTier[];
  counts: {
    paperFormats: number;
    pricingVariables: number;
    businessRules: number;
    supportFaces: number;
    paramsLive: number;
    rulesLive: number;
    tiersPos: number;
    tiersUniversal: number;
  };
  errors?: string[];
};

export type FmParamLiveMeta = {
  liveValue?: string;
  liveSource?:
    | 'paper-format'
    | 'pricing-variable'
    | 'volume-tier'
    | 'support-face'
    | 'catalog'
    | 'session';
  writable?: boolean;
  isTruth: boolean;
};

export type FmTruthParameter = FmParameter & {
  truth: FmParamLiveMeta;
};

export type FmTruthRule = FmRule & {
  source: 'catalog' | 'database' | 'both';
  isTruth: boolean;
};

/** Règle après fusion des doublons / templates multi-articles. */
export type FmConsolidatedRule = FmTruthRule & {
  /** Occurrences fusionnées (ex. force-price répété sur 40 articles). */
  occurrenceCount: number;
  /** standard = zone commune tous articles ; family = spécifique. */
  scope: 'standard' | 'family';
  canonicalKey: string;
};

export const FM_STANDARD_RULES_FAMILY = 'Règles standard (tous articles)' as const;

function severityFromRuleType(ruleType: string): FmRuleSeverity {
  const t = ruleType.toLowerCase();
  if (t.includes('block') || t.includes('force') || t.includes('validation')) return 'block';
  if (t.includes('compat') || t.includes('filter') || t.includes('qty')) return 'warn';
  return 'info';
}

function formatTierValue(t: FmLiveVolumeTier): string {
  const max = t.maxQty == null ? '+' : String(t.maxQty);
  const pct = Number(t.discountPercent) || 0;
  const pctLabel = pct === 0 ? '0 %' : `−${pct} %`;
  return `${t.minQty}–${max} / ${pctLabel}`;
}

/** Construit overrides live à partir des formats + variables + paliers DB. */
export function buildLiveParamOverrides(payload: FmLiveSyncPayload): Record<string, string> {
  const out: Record<string, string> = {};
  const byCode = new Map(
    payload.paperFormats.map((f) => [f.formatCode.toUpperCase(), f]),
  );
  for (const [fmKey, formatCode] of Object.entries(FM_FORMAT_KEY_TO_CODE)) {
    const row = byCode.get(formatCode.toUpperCase());
    if (row && Number.isFinite(row.ratioA4)) {
      out[fmKey] = String(row.ratioA4);
    }
  }
  const vars = new Map(payload.pricingVariables.map((v) => [v.code, v]));
  for (const [fmKey, varCode] of Object.entries(FM_PARAM_TO_VARIABLE)) {
    const row = vars.get(varCode);
    if (row?.value != null && String(row.value).trim() !== '') {
      out[fmKey] = String(row.value);
    }
  }
  for (const code of [
    'face_recto_verso_mult',
    'finition_surcharge_pct',
    'production_standard',
    'production_express48h',
    'production_super24h',
    'bat_physique_papier',
    'livraison_tana',
    'livraison_province',
  ]) {
    const row = vars.get(code);
    if (row?.value != null && String(row.value).trim() !== '') {
      out[code] = String(row.value);
    }
  }

  FM_TIER_POS_KEYS.forEach((key, i) => {
    const tier = payload.tiersPos[i];
    if (tier) out[key] = formatTierValue(tier);
  });
  FM_TIER_UNIVERSAL_KEYS.forEach((key, i) => {
    const tier = payload.tiersUniversal[i];
    if (tier) out[key] = formatTierValue(tier);
  });

  return out;
}

/**
 * Vérité d’affichage :
 * 1) dirty session (édition en cours)
 * 2) live DB
 * 3) catalogue (doc — isTruth=false)
 */
export function resolveParamDisplayValue(
  param: FmParameter,
  sessionDirty: Record<string, string>,
  liveOverrides: Record<string, string>,
): { value: string; meta: FmParamLiveMeta } {
  if (!param.key) {
    return {
      value: param.value,
      meta: { liveSource: 'catalog', isTruth: false, writable: false },
    };
  }
  if (sessionDirty[param.key] != null && sessionDirty[param.key] !== '') {
    return {
      value: sessionDirty[param.key]!,
      meta: {
        liveValue: liveOverrides[param.key],
        liveSource: 'session',
        writable: true,
        isTruth: false,
      },
    };
  }
  if (liveOverrides[param.key] != null) {
    let source: FmParamLiveMeta['liveSource'] = 'pricing-variable';
    if (param.key.startsWith('format-')) source = 'paper-format';
    else if (param.key.startsWith('tier-')) source = 'volume-tier';
    else if (param.key.startsWith('face-')) source = 'support-face';
    return {
      value: liveOverrides[param.key]!,
      meta: {
        liveValue: liveOverrides[param.key],
        liveSource: source,
        writable: Boolean(
          FM_PARAM_TO_VARIABLE[param.key] ||
            FM_FORMAT_KEY_TO_CODE[param.key] ||
            param.key.startsWith('tier-'),
        ),
        isTruth: true,
      },
    };
  }
  return {
    value: param.value,
    meta: {
      liveSource: 'catalog',
      writable: Boolean(param.key),
      isTruth: false,
    },
  };
}

/** Paramètres catalogue enrichis + variables DB hors catalogue. */
export function buildTruthParameters(
  catalog: FmParameter[],
  live: FmLiveSyncPayload | null,
  sessionDirty: Record<string, string>,
): FmTruthParameter[] {
  const liveOverrides = live ? buildLiveParamOverrides(live) : {};
  const out: FmTruthParameter[] = catalog.map((param) => {
    const { value, meta } = resolveParamDisplayValue(param, sessionDirty, liveOverrides);
    const status: FmParamStatus =
      param.key && !meta.isTruth && meta.liveSource === 'catalog'
        ? 'warn'
        : param.status;
    return {
      ...param,
      value,
      status,
      truth: meta,
    };
  });

  if (!live) return out;

  const knownKeys = new Set(
    catalog.map((p) => p.key).filter(Boolean) as string[],
  );
  const mappedVarCodes = new Set(Object.values(FM_PARAM_TO_VARIABLE));
  for (const v of live.pricingVariables) {
    if (!v.active && v.active !== undefined) continue;
    if (mappedVarCodes.has(v.code) || knownKeys.has(v.code)) continue;
    if (liveOverrides[v.code] == null) continue;
    out.push({
      group: 'variable',
      section: 'J. VARIABLES GLOBALES DB (PricingVariable)',
      ref: `VAR-${v.code}`,
      name: v.label || v.code,
      value: String(v.value),
      rule: 'Variable globale active — source Backoffice tarification.',
      condition: 'Toujours',
      scope: 'Global',
      status: 'ok',
      key: v.code,
      truth: {
        liveValue: String(v.value),
        liveSource: 'pricing-variable',
        writable: true,
        isTruth: true,
      },
    });
  }

  for (const face of live.supportFaces) {
    if (face.active === false) continue;
    const key = `face-${face.supportKey || face.supportName || 'x'}`;
    const rv = face.rectoVersoAllowed ? 'RV autorisé' : 'RV bloqué';
    const recto = face.rectoAllowed === false ? 'recto bloqué' : 'recto OK';
    out.push({
      group: 'rectoverso',
      section: 'K. FACES SUPPORT DB (SupportFaceRule)',
      ref: `FACE-${(face.supportKey || 'x').toUpperCase()}`,
      name: face.supportName || face.supportKey || 'Support',
      value: `${recto} · ${rv}`,
      rule: 'Matrice recto / verso / RV lue depuis SupportFaceRule.',
      condition: 'Si support sélectionné',
      scope: face.supportKey || 'Support',
      status: face.rectoVersoAllowed === false ? 'block' : 'ok',
      key,
      truth: {
        liveValue: `${recto} · ${rv}`,
        liveSource: 'support-face',
        writable: false,
        isTruth: true,
      },
    });
  }

  return out;
}

/** Fusion règles : DB = vrai ; catalogue seul = documentation. */
export function mergeLiveRules(
  catalog: FmRule[],
  live: FmLiveBusinessRule[],
): FmTruthRule[] {
  const byCode = new Map<string, FmTruthRule>();
  for (const r of catalog) {
    byCode.set(r.code.toUpperCase(), {
      ...r,
      source: 'catalog',
      isTruth: false,
    });
  }
  live.forEach((row, index) => {
    if (row.active === false) return;
    let code = (row.ruleKey || '').trim();
    if (!code) {
      // Ne jamais perdre une règle DB sans clé — clé de repli stable.
      const slug = [row.family, row.ruleName, row.ruleType, String(index)]
        .filter(Boolean)
        .join('-')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 72);
      code = `DB-${slug || index}`;
    }
    const key = code.toUpperCase();
    const existing = byCode.get(key);
    const mapped: FmRule = {
      code,
      family: (row.family || 'Métier').trim() || 'Métier',
      rule: row.ruleName || code,
      action: row.message || row.ruleType || 'Règle métier',
      severity: severityFromRuleType(row.ruleType || 'info'),
    };
    if (existing) {
      byCode.set(key, {
        ...existing,
        rule: mapped.rule || existing.rule,
        action: mapped.action || existing.action,
        family: mapped.family || existing.family,
        severity: mapped.severity,
        source: 'both',
        isTruth: true,
      });
    } else {
      byCode.set(key, { ...mapped, source: 'database', isTruth: true });
    }
  });
  return [...byCode.values()].sort((a, b) => {
    const fam = (a.family || '').localeCompare(b.family || '', 'fr', { sensitivity: 'base' });
    if (fam !== 0) return fam;
    return a.code.localeCompare(b.code, 'fr');
  });
}

function normalizeRuleIdea(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const PER_ARTICLE_SUFFIX_RE =
  /^(?<article>.+)-(?<field>[a-z0-9_]+)-(?<kind>force-price|filter|palette|compat|show)$/i;
const PER_ARTICLE_QTY_RE = /^(?<article>.+)-(?<kind>qty-min)$/i;

/** Familles réellement transverses (pas « Métier » / « Papiers » trop génériques). */
const STANDARD_FAMILY_RE =
  /^(g[eé]n[eé]ral|synchronisation|standard|global|commun|transverse|base formules?)$/i;

const STANDARD_CONTENT_RE =
  /tous les articles|tous les produits|tous les configurateurs|partag[eé]e? entre|universel|standardis|parcours configurateur identique|identique sur tous|source tarifaire|bloc web unique/i;

const KIND_LABELS: Record<string, string> = {
  'force-price': 'Prix forcé — option personnalisée',
  filter: 'Filtre d’options dépendant',
  palette: 'Palette couleurs contrainte',
  compat: 'Compatibilité options',
  show: 'Affichage conditionnel de champ',
  'qty-min': 'Quantité minimum article',
};

function severityRank(s: FmRuleSeverity): number {
  if (s === 'block') return 3;
  if (s === 'warn') return 2;
  return 1;
}

function pickStrongerSeverity(a: FmRuleSeverity, b: FmRuleSeverity): FmRuleSeverity {
  return severityRank(a) >= severityRank(b) ? a : b;
}

/**
 * Fusionne les idées identiques et les templates répétés par article
 * (`fly-std-format-force-price`, `cv-std-format-force-price` → 1 règle standard).
 * Regroupe aussi Général / Synchronisation / contenu « tous les articles ».
 */
export function consolidateBusinessRules(rules: FmTruthRule[]): FmConsolidatedRule[] {
  type Acc = FmConsolidatedRule & { ideaKey: string };
  const byIdea = new Map<string, Acc>();

  for (const rule of rules) {
    const code = String(rule.code ?? '').trim();
    const perArticle =
      code.match(PER_ARTICLE_SUFFIX_RE) ?? code.match(PER_ARTICLE_QTY_RE);
    const kind = perArticle?.groups?.kind?.toLowerCase() ?? '';
    const field = perArticle?.groups?.field?.toLowerCase() ?? '';

    let ideaKey: string;
    let scope: 'standard' | 'family' = 'family';
    let displayCode = code;
    let displayRule = rule.rule;
    let displayFamily = rule.family || 'Métier';

    if (kind) {
      ideaKey = field ? `tpl:${kind}:${field}` : `tpl:${kind}`;
      scope = 'standard';
      displayCode = field
        ? `STD-${kind.toUpperCase()}-${field.toUpperCase()}`
        : `STD-${kind.toUpperCase()}`;
      displayRule = KIND_LABELS[kind]
        ? field
          ? `${KIND_LABELS[kind]} · champ « ${field} »`
          : KIND_LABELS[kind]
        : rule.rule;
      displayFamily = FM_STANDARD_RULES_FAMILY;
    } else {
      const idea = normalizeRuleIdea(`${rule.rule}|${rule.action}|${rule.severity}`);
      ideaKey = `idea:${idea}`;
      if (
        STANDARD_FAMILY_RE.test(displayFamily.trim())
        || STANDARD_CONTENT_RE.test(`${rule.rule} ${rule.action}`)
        || /^(cfg|sync|papier)-/i.test(code)
      ) {
        scope = 'standard';
        displayFamily = FM_STANDARD_RULES_FAMILY;
      }
    }

    const existing = byIdea.get(ideaKey);
    if (!existing) {
      byIdea.set(ideaKey, {
        ...rule,
        code: displayCode,
        rule: displayRule,
        family: displayFamily,
        occurrenceCount: 1,
        scope,
        canonicalKey: ideaKey,
        ideaKey,
      });
      continue;
    }

    existing.occurrenceCount += 1;
    existing.severity = pickStrongerSeverity(existing.severity, rule.severity);
    existing.isTruth = existing.isTruth || rule.isTruth;
    if (rule.isTruth && !existing.isTruth) {
      existing.action = rule.action || existing.action;
    }
    if (existing.source !== rule.source) existing.source = 'both';
    if (existing.occurrenceCount >= 2 || scope === 'standard') {
      existing.scope = 'standard';
      existing.family = FM_STANDARD_RULES_FAMILY;
    }
    // Enrichit l’effet avec le volume fusionné
    if (existing.occurrenceCount > 1 && kind) {
      existing.action = `${rule.action || existing.action} · appliqué sur ${existing.occurrenceCount} articles (fusionné)`.trim();
    }
  }

  const out = [...byIdea.values()].map(({ ideaKey: _k, ...rest }) => rest);
  out.sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === 'standard' ? -1 : 1;
    const fam = (a.family || '').localeCompare(b.family || '', 'fr', { sensitivity: 'base' });
    if (fam !== 0) return fam;
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev !== 0) return sev;
    return a.code.localeCompare(b.code, 'fr');
  });
  return out;
}

export function countLiveParamHits(
  parameters: FmParameter[],
  liveOverrides: Record<string, string>,
): number {
  return parameters.filter((p) => p.key && liveOverrides[p.key] != null).length;
}

/** Clés calcul à ne plus charger depuis localStorage (évite faux prix). */
export function isCalcAffectingOverrideKey(key: string): boolean {
  return (
    key in FM_FORMAT_KEY_TO_CODE ||
    key in FM_PARAM_TO_VARIABLE ||
    key.startsWith('tier-') ||
    key === 'waste' ||
    key === 'face_recto_verso_mult' ||
    key === 'finition_surcharge_pct' ||
    key.startsWith('production_') ||
    key.startsWith('livraison_') ||
    key.startsWith('bat_')
  );
}

export function stripCalcOverrides(
  overrides: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (!isCalcAffectingOverrideKey(k)) out[k] = v;
  }
  return out;
}
