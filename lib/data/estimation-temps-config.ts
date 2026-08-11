/**
 * Temps & capacités — vitesses moyennes par article / opération atelier.
 * Source Admin → SystemConfig → Planning / GPAO / délais.
 */

export const ESTIMATION_TEMPS_CONFIG_KEY = 'estimation-temps-v1';

export type TimeRateMode = 'pcs_per_hour' | 'fixed_min' | 'm2_per_hour';
export type ResourceType = 'machine' | 'person' | 'either' | 'controle';
export type TaskCategory =
  | 'conception'
  | 'impression'
  | 'finition'
  | 'controle'
  | 'logistique'
  | 'autre';

export type EstimationTaskKeyDef = {
  key: string;
  label: string;
  category: TaskCategory;
  defaultResource: ResourceType;
  defaultColor: string;
};

/** Catalogue d’opérations atelier (conception, impression, finitions, CQ…). */
export const ESTIMATION_TASK_KEYS: EstimationTaskKeyDef[] = [
  // Conception
  { key: 'conception', label: 'Conception graphique', category: 'conception', defaultResource: 'person', defaultColor: '#9b62d9' },
  { key: 'pao', label: 'PAO / mise en page', category: 'conception', defaultResource: 'person', defaultColor: '#8b5cf6' },
  { key: 'retouche', label: 'Retouche photo', category: 'conception', defaultResource: 'person', defaultColor: '#a78bfa' },
  { key: 'bat', label: 'BAT / validation visuelle', category: 'conception', defaultResource: 'person', defaultColor: '#7c3aed' },
  // Impression
  { key: 'impression', label: 'Impression', category: 'impression', defaultResource: 'machine', defaultColor: '#6758e8' },
  { key: 'impression_offset', label: 'Impression offset', category: 'impression', defaultResource: 'machine', defaultColor: '#5b4fcf' },
  { key: 'impression_gf', label: 'Impression grand format', category: 'impression', defaultResource: 'machine', defaultColor: '#4f46e5' },
  { key: 'sechage', label: 'Séchage & stabilisation', category: 'impression', defaultResource: 'machine', defaultColor: '#ef9760' },
  // Finitions / façonnage
  { key: 'decoupe', label: 'Découpe', category: 'finition', defaultResource: 'person', defaultColor: '#19a67b' },
  { key: 'decoupe_laser', label: 'Découpe laser', category: 'finition', defaultResource: 'machine', defaultColor: '#0d9488' },
  { key: 'massicot', label: 'Massicotage', category: 'finition', defaultResource: 'person', defaultColor: '#14b8a6' },
  { key: 'pelliculage', label: 'Pelliculage / lamination', category: 'finition', defaultResource: 'machine', defaultColor: '#ea9551' },
  { key: 'plastification', label: 'Plastification', category: 'finition', defaultResource: 'machine', defaultColor: '#f59e0b' },
  { key: 'vernis', label: 'Vernis / UV sélectif', category: 'finition', defaultResource: 'machine', defaultColor: '#d97706' },
  { key: 'dorure', label: 'Dorure à chaud', category: 'finition', defaultResource: 'machine', defaultColor: '#ca8a04' },
  { key: 'gauffrage', label: 'Gaufrage / embossage', category: 'finition', defaultResource: 'machine', defaultColor: '#a16207' },
  { key: 'rainage', label: 'Rainage', category: 'finition', defaultResource: 'person', defaultColor: '#65a30d' },
  { key: 'pliage', label: 'Pliage', category: 'finition', defaultResource: 'person', defaultColor: '#84cc16' },
  { key: 'perforation', label: 'Perforation', category: 'finition', defaultResource: 'person', defaultColor: '#22c55e' },
  { key: 'assemblage', label: 'Assemblage / collation', category: 'finition', defaultResource: 'person', defaultColor: '#16a34a' },
  { key: 'reliure_spirale', label: 'Reliure spirale', category: 'finition', defaultResource: 'person', defaultColor: '#15803d' },
  { key: 'reliure_dos_carre', label: 'Dos carré collé', category: 'finition', defaultResource: 'person', defaultColor: '#166534' },
  { key: 'agrafage', label: 'Agrafage', category: 'finition', defaultResource: 'person', defaultColor: '#14532d' },
  { key: 'perforation_oeillet', label: 'Œillets / perforation', category: 'finition', defaultResource: 'person', defaultColor: '#047857' },
  { key: 'couture', label: 'Couture / ourlet', category: 'finition', defaultResource: 'person', defaultColor: '#db5379' },
  { key: 'pose_accessoire', label: 'Pose accessoire', category: 'finition', defaultResource: 'person', defaultColor: '#e11d48' },
  { key: 'faconnage', label: 'Façonnage (générique)', category: 'finition', defaultResource: 'person', defaultColor: '#2886da' },
  // Contrôle & logistique
  { key: 'verification', label: 'Contrôle qualité', category: 'controle', defaultResource: 'controle', defaultColor: '#dc5078' },
  { key: 'emballage', label: 'Emballage', category: 'logistique', defaultResource: 'person', defaultColor: '#2886da' },
  { key: 'livraison_prep', label: 'Préparation livraison', category: 'logistique', defaultResource: 'person', defaultColor: '#2563eb' },
];

export type ArticleTaskTimeRate = {
  id: string;
  articleId: string;
  articleLabel: string;
  family: string;
  taskKey: string;
  taskLabel: string;
  mode: TimeRateMode;
  rateValue: number;
  setupMin: number;
  resourceType: ResourceType;
  resourceHint: string;
  /** Capacité parallèle (nb personnes / machines actives) */
  people: number;
  color: string;
  qtyRef: number;
  notes: string;
  active: boolean;
  sortOrder: number;
};

export type AtelierCapacitySettings = {
  openHour: string;
  closeHour: string;
  pauseMin: number;
  safetyMarginPct: number;
};

export type EstimationTempsConfig = {
  version: 1;
  updatedAt: string;
  rates: ArticleTaskTimeRate[];
  capacity: AtelierCapacitySettings;
};

export const DEFAULT_ATELIER_CAPACITY: AtelierCapacitySettings = {
  openHour: '08:00',
  closeHour: '17:00',
  pauseMin: 60,
  safetyMarginPct: 15,
};

export function modeLabel(mode: TimeRateMode): string {
  switch (mode) {
    case 'pcs_per_hour':
      return 'Pièces / heure';
    case 'm2_per_hour':
      return 'm² / heure';
    case 'fixed_min':
      return 'Durée fixe (min)';
    default:
      return mode;
  }
}

export function resourceLabel(r: ResourceType): string {
  switch (r) {
    case 'machine':
      return 'Machine';
    case 'person':
      return 'Opérateur';
    case 'controle':
      return 'Contrôle';
    case 'either':
      return 'Machine ou personne';
    default:
      return r;
  }
}

export function categoryLabel(c: TaskCategory): string {
  switch (c) {
    case 'conception':
      return 'Conception';
    case 'impression':
      return 'Impression';
    case 'finition':
      return 'Finition';
    case 'controle':
      return 'Contrôle';
    case 'logistique':
      return 'Logistique';
    default:
      return 'Autre';
  }
}

/**
 * Durée (min) = setup + (qty / (vitesse × capacité)) × 60
 * fixed_min : setup + rateValue (ignore qty).
 */
export function computeDurationMinutes(
  rate: Pick<ArticleTaskTimeRate, 'mode' | 'rateValue' | 'setupMin' | 'people'>,
  qty: number,
): number {
  const setup = Math.max(0, Number(rate.setupMin) || 0);
  const v = Number(rate.rateValue) || 0;
  const q = Math.max(0, Number(qty) || 0);
  const people = Math.max(1, Number(rate.people) || 1);
  if (rate.mode === 'fixed_min') {
    return Math.max(0, Math.round(setup + v));
  }
  if (v <= 0) return setup;
  const run = (q / (v * people)) * 60;
  return Math.max(0, Math.round(setup + run));
}

export function formatDurationMinutes(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return `${h} h`;
  return `${h} h ${String(rest).padStart(2, '0')}`;
}

export function rateUnitLabel(rate: ArticleTaskTimeRate): string {
  if (rate.mode === 'fixed_min') return 'temps fixe';
  if (rate.mode === 'm2_per_hour') return 'm²/h';
  if (rate.resourceType === 'person' || rate.resourceType === 'controle') {
    return 'pcs/h/pers.';
  }
  return 'pcs/h';
}

export function rateDisplay(rate: ArticleTaskTimeRate): string {
  if (rate.mode === 'fixed_min') return rate.rateValue ? `${rate.rateValue}` : '—';
  if (rate.mode === 'm2_per_hour') return `${rate.rateValue}`;
  return rate.rateValue ? rate.rateValue.toLocaleString('fr-FR') : '—';
}

function rid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function mk(
  partial: Omit<ArticleTaskTimeRate, 'people' | 'color' | 'active' | 'notes' | 'qtyRef'> &
    Partial<Pick<ArticleTaskTimeRate, 'people' | 'color' | 'active' | 'notes' | 'qtyRef'>>,
): ArticleTaskTimeRate {
  const def = ESTIMATION_TASK_KEYS.find((t) => t.key === partial.taskKey);
  return {
    people: 1,
    color: def?.defaultColor ?? '#6758e8',
    active: true,
    notes: '',
    qtyRef: 500,
    ...partial,
  };
}

/** Famille atelier déduite du catalogue (family + libellé). */
export type ProcessFamilyKey =
  | 'carterie'
  | 'flyer'
  | 'affiche'
  | 'grand_format'
  | 'plaque'
  | 'textile'
  | 'livre'
  | 'goodies'
  | 'standard';

type TemplateStep = {
  taskKey: string;
  mode: TimeRateMode;
  rateValue: number;
  setupMin: number;
  resourceHint: string;
  people?: number;
};

const PROCESS_TEMPLATES: Record<ProcessFamilyKey, { qtyRef: number; steps: TemplateStep[] }> = {
  carterie: {
    qtyRef: 500,
    steps: [
      { taskKey: 'impression', mode: 'pcs_per_hour', rateValue: 500, setupMin: 10, resourceHint: 'Presse numérique' },
      { taskKey: 'sechage', mode: 'fixed_min', rateValue: 0, setupMin: 20, resourceHint: 'Zone séchage' },
      { taskKey: 'massicot', mode: 'pcs_per_hour', rateValue: 220, setupMin: 5, resourceHint: 'Massicot', people: 1 },
      { taskKey: 'verification', mode: 'fixed_min', rateValue: 0, setupMin: 12, resourceHint: 'CQ' },
      { taskKey: 'emballage', mode: 'pcs_per_hour', rateValue: 1000, setupMin: 3, resourceHint: 'Finition' },
    ],
  },
  flyer: {
    qtyRef: 1000,
    steps: [
      { taskKey: 'pao', mode: 'fixed_min', rateValue: 45, setupMin: 0, resourceHint: 'PAO' },
      { taskKey: 'impression', mode: 'pcs_per_hour', rateValue: 800, setupMin: 12, resourceHint: 'Presse numérique' },
      { taskKey: 'massicot', mode: 'pcs_per_hour', rateValue: 600, setupMin: 5, resourceHint: 'Massicot' },
      { taskKey: 'pliage', mode: 'pcs_per_hour', rateValue: 400, setupMin: 8, resourceHint: 'Façonnage', people: 1 },
      { taskKey: 'verification', mode: 'fixed_min', rateValue: 0, setupMin: 15, resourceHint: 'CQ' },
      { taskKey: 'emballage', mode: 'pcs_per_hour', rateValue: 900, setupMin: 4, resourceHint: 'Finition' },
    ],
  },
  affiche: {
    qtyRef: 200,
    steps: [
      { taskKey: 'impression', mode: 'pcs_per_hour', rateValue: 180, setupMin: 15, resourceHint: 'Presse / plotter' },
      { taskKey: 'massicot', mode: 'pcs_per_hour', rateValue: 120, setupMin: 8, resourceHint: 'Massicot' },
      { taskKey: 'verification', mode: 'fixed_min', rateValue: 0, setupMin: 10, resourceHint: 'CQ' },
      { taskKey: 'emballage', mode: 'pcs_per_hour', rateValue: 250, setupMin: 5, resourceHint: 'Rouleau / emballage' },
    ],
  },
  grand_format: {
    qtyRef: 6,
    steps: [
      { taskKey: 'impression_gf', mode: 'm2_per_hour', rateValue: 12, setupMin: 20, resourceHint: 'Traceur GF' },
      { taskKey: 'decoupe', mode: 'fixed_min', rateValue: 20, setupMin: 8, resourceHint: 'Opérateur GF' },
      { taskKey: 'perforation_oeillet', mode: 'fixed_min', rateValue: 12, setupMin: 5, resourceHint: 'Finition GF' },
      { taskKey: 'verification', mode: 'fixed_min', rateValue: 0, setupMin: 10, resourceHint: 'CQ' },
      { taskKey: 'emballage', mode: 'fixed_min', rateValue: 8, setupMin: 3, resourceHint: 'Roulage' },
    ],
  },
  plaque: {
    qtyRef: 10,
    steps: [
      { taskKey: 'impression_gf', mode: 'm2_per_hour', rateValue: 8, setupMin: 25, resourceHint: 'Traceur / flatbed' },
      { taskKey: 'decoupe', mode: 'fixed_min', rateValue: 30, setupMin: 10, resourceHint: 'Découpe plaque' },
      { taskKey: 'verification', mode: 'fixed_min', rateValue: 0, setupMin: 12, resourceHint: 'CQ' },
      { taskKey: 'emballage', mode: 'fixed_min', rateValue: 10, setupMin: 5, resourceHint: 'Protection coin' },
    ],
  },
  textile: {
    qtyRef: 50,
    steps: [
      { taskKey: 'conception', mode: 'fixed_min', rateValue: 40, setupMin: 0, resourceHint: 'Designer' },
      { taskKey: 'impression', mode: 'pcs_per_hour', rateValue: 40, setupMin: 25, resourceHint: 'Presse textile' },
      { taskKey: 'verification', mode: 'pcs_per_hour', rateValue: 120, setupMin: 5, resourceHint: 'CQ textile' },
      { taskKey: 'emballage', mode: 'pcs_per_hour', rateValue: 80, setupMin: 4, resourceHint: 'Pliage textile' },
    ],
  },
  livre: {
    qtyRef: 100,
    steps: [
      { taskKey: 'pao', mode: 'fixed_min', rateValue: 120, setupMin: 0, resourceHint: 'PAO' },
      { taskKey: 'impression', mode: 'pcs_per_hour', rateValue: 120, setupMin: 20, resourceHint: 'Presse numérique' },
      { taskKey: 'assemblage', mode: 'pcs_per_hour', rateValue: 80, setupMin: 10, resourceHint: 'Collation', people: 2 },
      { taskKey: 'reliure_dos_carre', mode: 'pcs_per_hour', rateValue: 60, setupMin: 15, resourceHint: 'Reliure' },
      { taskKey: 'verification', mode: 'fixed_min', rateValue: 0, setupMin: 20, resourceHint: 'CQ' },
      { taskKey: 'emballage', mode: 'pcs_per_hour', rateValue: 100, setupMin: 5, resourceHint: 'Carton' },
    ],
  },
  goodies: {
    qtyRef: 100,
    steps: [
      { taskKey: 'conception', mode: 'fixed_min', rateValue: 30, setupMin: 0, resourceHint: 'Designer' },
      { taskKey: 'impression', mode: 'pcs_per_hour', rateValue: 35, setupMin: 20, resourceHint: 'Sublimation / tampo' },
      { taskKey: 'pose_accessoire', mode: 'pcs_per_hour', rateValue: 50, setupMin: 8, resourceHint: 'Pose / finition' },
      { taskKey: 'verification', mode: 'pcs_per_hour', rateValue: 90, setupMin: 5, resourceHint: 'CQ' },
      { taskKey: 'emballage', mode: 'pcs_per_hour', rateValue: 70, setupMin: 4, resourceHint: 'Emballage unitaire' },
    ],
  },
  standard: {
    qtyRef: 500,
    steps: [
      { taskKey: 'impression', mode: 'pcs_per_hour', rateValue: 400, setupMin: 12, resourceHint: 'Presse numérique' },
      { taskKey: 'massicot', mode: 'pcs_per_hour', rateValue: 300, setupMin: 6, resourceHint: 'Massicot' },
      { taskKey: 'verification', mode: 'fixed_min', rateValue: 0, setupMin: 12, resourceHint: 'CQ' },
      { taskKey: 'emballage', mode: 'pcs_per_hour', rateValue: 500, setupMin: 4, resourceHint: 'Finition' },
    ],
  },
};

export function inferProcessFamily(family: string, label: string): ProcessFamilyKey {
  const hay = `${family} ${label}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/carte|carterie|visite|fidelite|loyalty|jeu de cartes/.test(hay)) return 'carterie';
  if (/flyer|depliant|brochure(?! reli)|leaflet/.test(hay)) return 'flyer';
  if (/affiche|poster|evenement/.test(hay)) return 'affiche';
  if (/plexiglas|acrylic|plexi|forex|dibond|pvc|plaque|akilux|aludibond/.test(hay)) return 'plaque';
  if (/bache|roll.?up|kakemono|grand.?format|vinyle|panneau|toile|canvas|mesh/.test(hay)) {
    return 'grand_format';
  }
  if (/t.?shirt|textile|polo|casquette|tote|broderie|sweat|textile/.test(hay)) return 'textile';
  if (/livre|catalogue|magazine|reliure|dos carre|spirale/.test(hay)) return 'livre';
  if (
    /goodies|stylo|mug|tasse|assiette|cle|usb|tampon|badge|objet|gourde|briquet|parapluie|porte.?cle|tapis/
      .test(hay)
  ) {
    return 'goodies';
  }
  if (/goodie/.test(hay)) return 'goodies';
  if (/grand format|gf\b/.test(hay)) return 'grand_format';
  return 'standard';
}

/** Parcours atelier réaliste pour un article catalogue (jamais vide). */
export function buildProcessRatesForArticle(article: {
  articleId: string;
  articleLabel: string;
  family: string;
}): ArticleTaskTimeRate[] {
  const processKey = inferProcessFamily(article.family, article.articleLabel);
  const tpl = PROCESS_TEMPLATES[processKey];
  const slug = article.articleId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  return tpl.steps.map((step, i) => {
    const def = ESTIMATION_TASK_KEYS.find((t) => t.key === step.taskKey);
    return mk({
      id: `auto-${slug}-${step.taskKey}-${i + 1}`,
      articleId: article.articleId,
      articleLabel: article.articleLabel,
      family: article.family || 'Général',
      taskKey: step.taskKey,
      taskLabel: def?.label || step.taskKey,
      mode: step.mode,
      rateValue: step.rateValue,
      setupMin: step.setupMin,
      resourceType: def?.defaultResource || 'either',
      resourceHint: step.resourceHint,
      people: step.people ?? 1,
      qtyRef: tpl.qtyRef,
      sortOrder: (i + 1) * 10,
      notes: `Parcours type · ${processKey}`,
    });
  });
}

/**
 * Complète les articles sans opérations actives avec un parcours type famille.
 * Ne touche pas aux articles déjà renseignés.
 */
export function ensureRatesForArticles(
  rates: ArticleTaskTimeRate[],
  articles: Array<{ articleId: string; articleLabel: string; family: string }>,
): { rates: ArticleTaskTimeRate[]; filledCount: number } {
  const activeByArticle = new Set(
    rates.filter((r) => r.active).map((r) => r.articleId),
  );
  const next = [...rates];
  let filledCount = 0;
  for (const a of articles) {
    if (activeByArticle.has(a.articleId)) continue;
    const generated = buildProcessRatesForArticle(a);
    next.push(...generated);
    activeByArticle.add(a.articleId);
    filledCount += 1;
  }
  return { rates: next, filledCount };
}

const SEED_ARTICLES = [
  { articleId: 'cv-std', articleLabel: 'Carte de visite', family: 'Carterie' },
  { articleId: 'fly-std', articleLabel: 'Flyer A5', family: 'Flyer' },
  { articleId: 'aff-std', articleLabel: 'Affiche A2', family: 'Affiche' },
  { articleId: 'bac-bache', articleLabel: 'Bâche / Roll-up', family: 'Grand format' },
  { articleId: 'plx-acrylic', articleLabel: 'Acrylic / Plexiglas', family: 'Grand format' },
  { articleId: 'tex-tshirt', articleLabel: 'T-shirt imprimé', family: 'Textile' },
  { articleId: 'liv-brochure', articleLabel: 'Brochure reliée', family: 'Livres' },
  { articleId: 'gd-tasse', articleLabel: 'Assiette', family: 'Goodies' },
  { articleId: 'gd-stylo', articleLabel: 'Stylo personnalisé', family: 'Goodies' },
  { articleId: 'gd-mug', articleLabel: 'Mug', family: 'Goodies' },
];

/** Grille seed ANS — parcours types multi-familles (jamais vide). */
export function buildDefaultEstimationTempsConfig(): EstimationTempsConfig {
  const rates = SEED_ARTICLES.flatMap((a) => buildProcessRatesForArticle(a));
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    rates,
    capacity: { ...DEFAULT_ATELIER_CAPACITY },
  };
}

export function normalizeCapacity(
  input?: Partial<AtelierCapacitySettings> | null,
): AtelierCapacitySettings {
  return {
    openHour: input?.openHour || DEFAULT_ATELIER_CAPACITY.openHour,
    closeHour: input?.closeHour || DEFAULT_ATELIER_CAPACITY.closeHour,
    pauseMin: Math.max(0, Number(input?.pauseMin) || 0),
    safetyMarginPct: Math.max(0, Math.min(100, Number(input?.safetyMarginPct) ?? 15)),
  };
}

export function normalizeRate(
  input: Partial<ArticleTaskTimeRate> & Pick<ArticleTaskTimeRate, 'articleId' | 'taskKey' | 'mode' | 'rateValue'>,
  sortFallback = 0,
): ArticleTaskTimeRate {
  const taskDef = ESTIMATION_TASK_KEYS.find((t) => t.key === input.taskKey);
  return {
    id: input.id?.trim() || rid('rate'),
    articleId: input.articleId.trim(),
    articleLabel: (input.articleLabel || input.articleId).trim(),
    family: (input.family || 'Général').trim(),
    taskKey: input.taskKey.trim(),
    taskLabel: (input.taskLabel || taskDef?.label || input.taskKey).trim(),
    mode: input.mode,
    rateValue: Math.max(0, Number(input.rateValue) || 0),
    setupMin: Math.max(0, Number(input.setupMin) || 0),
    resourceType: input.resourceType || taskDef?.defaultResource || 'either',
    resourceHint: (input.resourceHint || '').trim(),
    people: Math.max(1, Number(input.people) || 1),
    color: (input.color || taskDef?.defaultColor || '#6758e8').trim(),
    qtyRef: Math.max(1, Number(input.qtyRef) || 1),
    notes: (input.notes || '').trim(),
    active: input.active !== false,
    sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : sortFallback,
  };
}

export function newRateId() {
  return rid('rate');
}

/** Prêt au plus tôt à partir de maintenant + durée avec marge, borné aux horaires atelier. */
export function estimateReadyAt(
  totalTechnicalMin: number,
  capacity: AtelierCapacitySettings,
  from = new Date(),
): Date {
  const margin = 1 + capacity.safetyMarginPct / 100;
  const needed = Math.round(totalTechnicalMin * margin);
  const [oh, om] = capacity.openHour.split(':').map(Number);
  const [ch, cm] = capacity.closeHour.split(':').map(Number);
  let cursor = new Date(from);
  let remaining = needed;

  // Avancer minute par minute en blocs (efficacité)
  while (remaining > 0) {
    const open = new Date(cursor);
    open.setHours(oh || 8, om || 0, 0, 0);
    const close = new Date(cursor);
    close.setHours(ch || 17, cm || 0, 0, 0);
    if (cursor < open) cursor = open;
    if (cursor >= close) {
      cursor = new Date(open);
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }
    const available = Math.floor((close.getTime() - cursor.getTime()) / 60_000);
    const use = Math.min(remaining, available);
    cursor = new Date(cursor.getTime() + use * 60_000);
    remaining -= use;
    if (remaining > 0) {
      cursor = new Date(open);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return cursor;
}
