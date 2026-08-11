/**
 * Mapping Excel PALIERS_REMISE (article) → articleId catalogue ORION.
 * Une famille Excel → un produit POS/admin (variantes = options, pas d’IDs séparés).
 */
export const ANS_PALIER_ARTICLE_MAP: Record<string, string> = {
  'Reliure plastique / métallique': 'fin-reliure',
  'Reliure piqûre à cheval': 'fin-reliure',
  'Reliure dos carré collé': 'fin-collage',
  Pelliculage: 'fin-pelliculage',
  Plastification: 'fin-plastification',
  // Impression papier 80G Excel = décote grille PU — remises volume ISF gérées à part
  'A4 2/3/4 volets recto verso': 'fly-std',
  'Flyers 90x90 mm (A4 divisé par 6 + main d\'oeuvre)': 'fly-std',
  'Flyers A6 (4 flyers par feuille A4)': 'fly-std',
  'Flyers DL/135mmx135mm (3 flyers par feuille A4)': 'fly-std',
  'Flyers A5 (2 flyers par feuille A4)': 'fly-std',
  'Flyers B5 = A4 (1 flyer par feuille A4)': 'fly-std',
  'Carte de visite': 'cv-std',
  'P P Indechirable grand format': 'gf-pp',
  'P PHOTO GRAND FORMAT': 'gf-photo',
  'Tirage photo': 'ph-tirage',
  'POSTER EN PVC': 'gf-pvc',
  PLEXIGLASS: 'gf-plexi',
  'Vinyle blanc 150 cm': 'gf-vinyl-blanc',
  'Bache 180 cm': 'gf-bache',
  'Bache 240 et 320 cm& dos blanc': 'gf-bache',
  'vinyle transparent': 'gf-vinyl-transp',
  'Papier dos bleu': 'gf-dosbleu',
  'Oneway Vision': 'gf-oneway',
  'Frosted film sablé': 'gf-frosted',
  'Autocollant reflechissant': 'gf-reflechissant',
  'Tissus drapeau': 'gf-tissu',
  'T-Shirt 170 G': 'tx-tshirt',
  'T-Shirt 170 G · impression + presse seule': 'tx-tshirt',
  'Polo 220 G': 'tx-polo',
  'Polo 220 G · impression + presse seule': 'tx-polo',
  Casquette: 'tx-casquette',
  BOB: 'tx-bob',
  Trousse: 'tx-trousse',
  MUG: 'gd-mug',
  TOTEBAG: 'tx-totebag',
  STYLO: 'gd-stylo',
  Pins: 'gd-pins',
  Gourde: 'gd-gourde',
  Sweat: 'tx-sweat',
  'Roll up': 'plv-rollup',
  'X-Banner': 'plv-xbanner',
};

/** Familles Excel dont la remise % est déjà portée par les grilles PU (ISF). */
export const ANS_PALIER_SKIP_FAMILIES = new Set([
  'Impression papier 80 G',
  'PAPIER 90 à 135 G',
  'PAPIER 135 à 170 G',
  'PAPIER 170-300 G',
  'PAPIER 350 G',
  'PAPIER 600 G contre collé',
  'PAPIER 700 G contre collé',
  'PAPIER cover luxe 900 G',
  'PAPIER Toile fin',
  'PAPIER invitation luxe',
  'PAPIER Autocollant',
  'PVC Translucide',
  'PVC opaque',
  'Sublimation',
]);

export type AnsPalierTier = {
  minQty: number;
  maxQty: number | null;
  discountPercent: number;
};

export type AnsPalierVariantMeta = {
  variantKey: string;
  variantLabel: string;
  /** true = grille produit par défaut (fallback pricing) */
  isDefault?: boolean;
};

function slugifyVariantPart(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function extractPaperFormat(text: string): string | null {
  const t = text.toLowerCase();
  if (/\ba0\b|1\s*m2|120\s*x\s*80/.test(t)) return 'a0';
  if (/\ba1\b|80\s*x\s*60/.test(t)) return 'a1';
  if (/\ba2\b|60\s*x\s*40/.test(t)) return 'a2';
  if (/\ba3\b|40\s*x\s*30/.test(t)) return 'a3';
  if (/\ba4\b|20\s*x\s*30/.test(t)) return 'a4';
  if (/\ba5\b/.test(t)) return 'a5';
  if (/\ba6\b/.test(t)) return 'a6';
  if (/\bdl\b|135\s*mm/.test(t)) return 'dl';
  if (/90\s*x\s*90|carr[eé]/.test(t)) return '90x90';
  if (/\bb5\b/.test(t)) return 'b5';
  return null;
}

function extractThicknessMm(text: string): string | null {
  const m = text.match(/(\d+)\s*mm/i);
  return m ? `${m[1]}mm` : null;
}

function extractCvMaterial(text: string): string | null {
  const t = text.toLowerCase();
  if (/pvc\s*translucide/.test(t)) return 'pvc-translucide';
  if (/pvc\s*opaque/.test(t)) return 'pvc-opaque';
  if (/pellicul[eé].*370|370\s*g/.test(t)) return 'pellicule-370';
  if (/pellicul[eé].*320|320\s*g/.test(t)) return 'pellicule-320';
  if (/invitation/.test(t)) return 'invitation';
  if (/toile\s*fin/.test(t)) return 'toile-fin';
  if (/pcb\s*600|600\s*g/.test(t)) return 'pcb-600';
  if (/pcb\s*350|350\s*g/.test(t)) return 'pcb-350';
  if (/pcb|glossy|pcm|tissu/.test(t)) return 'pcb-std';
  return null;
}

function extractTextileParts(family: string, variante: string): { mode: string; zone: string | null } {
  const fam = family.toLowerCase();
  const v = variante.toLowerCase();
  const mode = /impression\s*\+\s*presse|sans\s*support|presse\s*seule/.test(fam) || /sans\s*support/.test(v)
    ? 'sans-support'
    : /avec\s*support/.test(v)
      ? 'avec-support'
      : /t-shirt|polo|sweat|totebag|casquette|bob|trousse/.test(fam)
        ? 'avec-support'
        : 'std';
  let zone: string | null = null;
  if (/zone\s*a6|logo/.test(v)) zone = 'zone-a6';
  else if (/zone\s*a5|2,\s*4,\s*6\s*ans|tailles?\s*2/.test(v)) zone = 'zone-a5';
  else if (/zone\s*a3|2xl|a4\s*\/\s*a3/.test(v)) zone = 'zone-a3';
  else if (/zone\s*a4|tailles?\s*s|tailles?\s*l|\bxl\b/.test(v)) zone = 'zone-a4';
  else if (/zone\s*a5/.test(v)) zone = 'zone-a5';
  return { mode, zone };
}

function flyerFamilyKey(family: string): string {
  const f = family.toLowerCase();
  if (/volets/.test(f)) return 'flyer-volets';
  if (/90x90|90\s*x\s*90/.test(f)) return 'flyer-90x90';
  if (/\ba6\b/.test(f)) return 'flyer-a6';
  if (/\bdl\b|135/.test(f)) return 'flyer-dl';
  if (/\ba5\b/.test(f)) return 'flyer-a5';
  if (/\bb5\b|=\s*a4/.test(f)) return 'flyer-b5';
  return `flyer-${slugifyVariantPart(family) || 'std'}`;
}

/**
 * Construit une clé stable + label pour une ligne / pack Excel PALIERS_REMISE.
 */
export function buildAnsPalierVariantKey(input: {
  family: string;
  articleId?: string;
  variante?: string;
  option_prix?: string;
  artId?: string;
}): AnsPalierVariantMeta {
  const family = String(input.family ?? '').trim();
  const variante = String(input.variante ?? '').trim();
  const option = String(input.option_prix ?? '').trim();
  const targetId = String(input.articleId ?? '').trim();
  const blob = `${variante} ${option}`.trim();
  const labelParts: string[] = [];

  // Flyers : clé portée par la famille Excel (formats différents → 1 produit)
  if (targetId === 'fly-std' || /^flyers?\b|^a4 2\/3\/4 volets/i.test(family)) {
    const key = flyerFamilyKey(family);
    if (option) labelParts.push(option);
    else if (variante) labelParts.push(variante);
    else labelParts.push(family);
    return {
      variantKey: key,
      variantLabel: labelParts.join(' · ') || family,
      isDefault: key === 'flyer-volets',
    };
  }

  // Bâche : laize d’abord (180 ≠ 240/320 — grilles PRIX 2026 distinctes)
  if (targetId === 'gf-bache' || /^bache\b/i.test(family)) {
    const wide = /240|320|dos\s*blanc/i.test(family + blob);
    if (wide) {
      return {
        variantKey: '240-320__a0',
        variantLabel: 'Laize 240/320 · A0 = 1 m² (30 000 Ar)',
        isDefault: false,
      };
    }
    const fmt = extractPaperFormat(blob || variante) || 'a4';
    const fmtLabel = variante || fmt.toUpperCase();
    return {
      variantKey: `180__${fmt}`,
      variantLabel: `Laize 180 cm · ${fmtLabel}`,
      isDefault: fmt === 'a4',
    };
  }

  // Textiles
  if (targetId.startsWith('tx-') || /t-shirt|polo|casquette|bob|trousse|totebag|sweat/i.test(family)) {
    const { mode, zone } = extractTextileParts(family, variante || option);
    const parts = [mode, zone].filter(Boolean) as string[];
    const key = parts.join('__') || 'avec-support';
    labelParts.push(mode === 'sans-support' ? 'Sans support / presse' : 'Avec support');
    if (zone) labelParts.push(zone.replace('zone-', 'Zone ').toUpperCase());
    if (variante && !zone) labelParts.push(variante);
    return {
      variantKey: key,
      variantLabel: labelParts.filter(Boolean).join(' · ') || family,
      isDefault: key === 'avec-support' || key.startsWith('avec-support__'),
    };
  }

  // CV
  if (targetId === 'cv-std' || /carte de visite/i.test(family)) {
    const mat = extractCvMaterial(blob || variante) || 'pcb-std';
    const face = /recto\s*[\/&]\s*verso|r\/v|rv/i.test(blob) ? 'rv' : /recto/i.test(blob) ? 'r' : '';
    const key = face ? `${mat}__${face}` : mat;
    return {
      variantKey: key,
      variantLabel: [variante || mat, option].filter(Boolean).join(' · ') || family,
      isDefault: mat === 'pcb-std',
    };
  }

  // PVC / Plexi : épaisseur + format
  if (targetId === 'gf-pvc' || targetId === 'gf-plexi' || /pvc|plexi/i.test(family + blob)) {
    const thick = extractThicknessMm(blob) || ( /5\s*mm/i.test(blob) ? '5mm' : /3\s*mm/i.test(blob) ? '3mm' : null);
    const fmt = extractPaperFormat(blob) || 'a4';
    const prefix = targetId === 'gf-plexi' || /plexi/i.test(family + blob) ? 'plexi' : 'pvc';
    const key = [prefix, thick, fmt].filter(Boolean).join('-');
    return {
      variantKey: key,
      variantLabel: variante || blob || family,
      isDefault: key.endsWith('-a4') && (thick === '3mm' || !thick),
    };
  }

  // Photo tirage
  if (targetId === 'ph-tirage' || /tirage photo/i.test(family)) {
    const fmt = extractPaperFormat(blob || variante) || 'a6';
    const pellicule = /pellicul/i.test(blob) ? 'pellicule' : null;
    const key = pellicule ? `${fmt}-${pellicule}` : fmt;
    return {
      variantKey: key,
      variantLabel: variante || key.toUpperCase(),
      isDefault: key === 'a6',
    };
  }

  // PLV rollup
  if (targetId === 'plv-rollup' || /roll\s*up/i.test(family)) {
    const deluxe = /deluxe/i.test(blob);
    return {
      variantKey: deluxe ? 'deluxe' : 'std',
      variantLabel: variante || (deluxe ? 'Deluxe' : 'Std'),
      isDefault: !deluxe,
    };
  }

  // Stylo
  if (targetId === 'gd-stylo' || /stylo/i.test(family)) {
    const dbl = /double|suppl/i.test(blob);
    return {
      variantKey: dbl ? 'double' : 'simple',
      variantLabel: variante || (dbl ? 'Double impression' : 'Simple'),
      isDefault: !dbl,
    };
  }

  // Finitions : variante = format/épaisseur
  if (targetId.startsWith('fin-')) {
    const key = slugifyVariantPart(variante || option || 'std') || 'std';
    return {
      variantKey: key,
      variantLabel: variante || option || family,
      isDefault: false,
    };
  }

  // Grand format générique : format papier
  const fmt = extractPaperFormat(blob || variante);
  if (fmt) {
    // Distinguer grilles matières secondaires (même format, ART plus élevé) via option
    const optSlug = option ? slugifyVariantPart(option) : '';
    const key = optSlug && optSlug !== fmt ? `${fmt}__${optSlug}` : fmt;
    return {
      variantKey: key,
      variantLabel: [variante, option].filter(Boolean).join(' · ') || fmt.toUpperCase(),
      isDefault: fmt === 'a4' && !optSlug,
    };
  }

  const fallback = slugifyVariantPart(variante || option || family) || 'default';
  return {
    variantKey: fallback,
    variantLabel: variante || option || family || fallback,
    isDefault: fallback === 'default',
  };
}

function cfgStr(config: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!config) return '';
  for (const k of keys) {
    const v = config[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

/**
 * Résout la variantKey à utiliser au calcul prix selon le config POS.
 */
export function resolvePricingVariantKey(
  articleId: string,
  config?: Record<string, unknown> | null,
): string {
  const id = String(articleId || '');
  const c = config ?? {};
  const format = cfgStr(c, 'format', 'formatFini', 'paperFormat', 'taille', 'size');
  const matiere = cfgStr(c, 'matiere', 'matériau', 'materiau', 'support', 'paperType', 'papier');
  const grammage = cfgStr(c, 'grammage', 'weight');
  const epaisseur = cfgStr(c, 'epaisseur', 'thickness', 'mm');
  const zone = cfgStr(c, 'zone', 'zoneMarquage', 'markingZone');
  const avecSupport = c.avecSupport ?? c.utiliseSupport ?? c.includeSupport;
  const blob = `${format} ${matiere} ${grammage} ${epaisseur} ${zone}`.trim();

  if (id === 'fly-std') {
    const f = format.toLowerCase();
    if (/volet|pli/.test(f) || Number(c.nbVolets ?? c.volets) > 1) return 'flyer-volets';
    if (/90/.test(f)) return 'flyer-90x90';
    if (/\ba6\b/.test(f)) return 'flyer-a6';
    if (/\bdl\b|135/.test(f)) return 'flyer-dl';
    if (/\ba5\b/.test(f)) return 'flyer-a5';
    if (/\bb5\b|\ba4\b/.test(f)) return 'flyer-b5';
    return 'flyer-volets';
  }

  if (id === 'gf-bache') {
    const laize = cfgStr(c, 'laize', 'width', 'largeur', 'laizeCm', 'type_bache');
    const typeBache = cfgStr(c, 'type_bache', 'typeBache');
    const wide = /240|320|2\s*m\s*40|3\s*m\s*20|2m40|3m20|dos\s*blanc/i.test(
      `${laize} ${matiere} ${format} ${typeBache}`,
    );
    const fmt = extractPaperFormat(format || blob) || (wide ? 'a0' : 'a4');
    if (wide) return '240-320__a0';
    return `180__${fmt}`;
  }

  if (id.startsWith('tx-')) {
    const sans =
      avecSupport === false
      || avecSupport === 0
      || avecSupport === '0'
      || /sans|presse|impression/.test(String(avecSupport ?? ''))
      || /sans\s*support|presse/.test(cfgStr(c, 'mode', 'pricingMode', 'typeCalcul'));
    const mode = sans ? 'sans-support' : 'avec-support';
    let z: string | null = null;
    const zBlob = (zone || format).toLowerCase();
    if (/a6|logo/.test(zBlob)) z = 'zone-a6';
    else if (/a5|enfant|2.?4.?6/.test(zBlob)) z = 'zone-a5';
    else if (/a3|2xl/.test(zBlob)) z = 'zone-a3';
    else if (/a4|s\b|m\b|l\b|xl/.test(zBlob)) z = 'zone-a4';
    return z ? `${mode}__${z}` : mode;
  }

  if (id === 'cv-std') {
    const mat = extractCvMaterial(`${matiere} ${grammage} ${format}`) || 'pcb-std';
    const faces = cfgStr(c, 'faces', 'face', 'rectoVerso').toLowerCase();
    const face = /r\/v|verso|2/.test(faces) ? 'rv' : '';
    return face ? `${mat}__${face}` : mat;
  }

  if (id === 'gf-pvc' || id === 'gf-plexi') {
    const prefix = id === 'gf-plexi' ? 'plexi' : 'pvc';
    const thick =
      extractThicknessMm(epaisseur || blob)
      || (/5/.test(epaisseur) ? '5mm' : '3mm');
    const fmt = extractPaperFormat(format || blob) || 'a4';
    return `${prefix}-${thick}-${fmt}`;
  }

  if (id === 'ph-tirage') {
    const fmt = extractPaperFormat(format || blob) || 'a6';
    if (/pellicul/i.test(matiere + format + cfgStr(c, 'finition'))) return `${fmt}-pellicule`;
    return fmt;
  }

  if (id === 'plv-rollup') {
    return /deluxe/i.test(format + matiere + cfgStr(c, 'modele', 'version')) ? 'deluxe' : 'std';
  }

  if (id === 'gd-stylo') {
    return /double|2/.test(cfgStr(c, 'zones', 'impression', 'faces') + format) ? 'double' : 'simple';
  }

  const fmt = extractPaperFormat(format || blob);
  if (fmt) {
    // Enrichir avec matière si présente (clés import a4__blanc, a4__vinyle-blanc…)
    const matSlug = matiere ? slugifyVariantPart(matiere) : '';
    if (matSlug) return `${fmt}__${matSlug}`;
    return fmt;
  }

  return '';
}

/**
 * Choisit les paliers d'une variante : match exact → préfixe → default → première grille.
 */
export function pickDiscountTiersForVariant<T extends { variantKey?: string | null }>(
  tiers: T[],
  variantKey: string,
): T[] {
  if (!tiers.length) return tiers;
  const key = String(variantKey || '');
  const byKey = new Map<string, T[]>();
  for (const t of tiers) {
    const vk = String(t.variantKey ?? '');
    if (!byKey.has(vk)) byKey.set(vk, []);
    byKey.get(vk)!.push(t);
  }
  if (key && byKey.has(key)) return byKey.get(key)!;
  // Alias legacy bâche
  if (key === 'bache-240-320' && byKey.has('240-320__a0')) return byKey.get('240-320__a0')!;
  if (key === '240-320__a0' && byKey.has('bache-240-320')) return byKey.get('bache-240-320')!;
  if (/^a([0-4])__bache-180/.test(key)) {
    const fmt = `180__a${key.match(/^a([0-4])/)?.[1]}`;
    if (byKey.has(fmt)) return byKey.get(fmt)!;
  }
  if (/^180__a([0-4])$/.test(key)) {
    const fmt = key.slice(-2);
    const legacy = [...byKey.keys()].find((k) => k.startsWith(`${fmt}__bache-180`) || k === fmt);
    if (legacy) return byKey.get(legacy)!;
  }
  // Préfixe (ex. avec-support__zone-a4 → avec-support)
  if (key.includes('__')) {
    const prefix = key.split('__')[0]!;
    const hit = [...byKey.entries()].find(([k]) => k === prefix || k.startsWith(`${prefix}__`));
    if (hit) return hit[1]!;
  }
  // Format seul dans une clé composite a4__…
  if (key && !key.includes('-')) {
    const hit = [...byKey.entries()].find(([k]) => k === key || k.startsWith(`${key}__`) || k.endsWith(`-${key}`));
    if (hit) return hit[1]!;
  }
  if (byKey.has('')) return byKey.get('')!;
  if (byKey.has('default')) return byKey.get('default')!;
  // Préférer a4 / avec-support / flyer-volets / std
  for (const prefer of ['180__a4', 'a4', 'avec-support', 'flyer-volets', 'pcb-std', 'std', 'a6', 'simple', 'pvc-3mm-a4', 'plexi-3mm-a4']) {
    if (byKey.has(prefer)) return byKey.get(prefer)!;
    const soft = [...byKey.entries()].find(([k]) => k.startsWith(prefer));
    if (soft) return soft[1]!;
  }
  return byKey.values().next().value ?? tiers;
}

/** Indique si cette variantKey doit être la grille « default » produit (fallback). */
export function isPreferredDefaultVariant(variantKey: string, articleId: string): boolean {
  const k = variantKey;
  if (!k || k === 'default') return true;
  if (articleId === 'fly-std') return k === 'flyer-volets';
  if (articleId.startsWith('tx-')) return k === 'avec-support' || k.startsWith('avec-support__');
  if (articleId === 'cv-std') return k === 'pcb-std' || k.startsWith('pcb-std');
  if (articleId === 'ph-tirage') return k === 'a6';
  if (articleId === 'gf-pvc') return k === 'pvc-3mm-a4' || k.startsWith('pvc-3mm-a4');
  if (articleId === 'gf-plexi') return k === 'plexi-3mm-a4' || k.startsWith('plexi-3mm-a4');
  if (articleId === 'plv-rollup') return k === 'std';
  if (articleId === 'gd-stylo') return k === 'simple';
  if (articleId === 'gf-bache') {
    return k === '180__a4' || k.startsWith('180__a4') || k === 'a4' || k.startsWith('a4__');
  }
  return k === 'a4' || k.startsWith('a4__');
}

/**
 * PRIX 2026 écrit souvent un palier « point » promo (ex. qty 16 @ 1 700)
 * qui chevauche la bande volume (16–160 @ 1 500). On ne garde que les bandes volume ;
 * on conserve uniquement un point à 0 % (prix catalogue, ex. A0 qty = 1).
 */
function dropExcelOverlapPointTiers(tiers: AnsPalierTier[]): AnsPalierTier[] {
  return tiers.filter((t) => {
    const isPoint = t.maxQty != null && t.maxQty === t.minQty;
    if (!isPoint) return true;
    if (t.discountPercent === 0) return true;
    const hasWiderSameMin = tiers.some(
      (o) =>
        o !== t
        && o.minQty === t.minQty
        && (o.maxQty == null || (t.maxQty != null && o.maxQty > t.maxQty)),
    );
    return !hasWiderSameMin;
  });
}

export function normalizeAnsPalierTiers(
  rows: Array<{ min_piece?: unknown; max_piece?: unknown; remise_pct?: unknown; minQty?: unknown; maxQty?: unknown; discountPercent?: unknown }>,
): AnsPalierTier[] {
  const parsed = rows
    .map((r) => {
      const minQty = Number(r.min_piece ?? r.minQty);
      const maxRaw = r.max_piece ?? r.maxQty;
      const maxQty =
        maxRaw === '' || maxRaw == null || !Number.isFinite(Number(maxRaw))
          ? null
          : Number(maxRaw);
      const discountPercent = Math.round(Number(r.remise_pct ?? r.discountPercent) * 100) / 100;
      return { minQty, maxQty, discountPercent };
    })
    .filter((t) => Number.isFinite(t.minQty) && t.minQty >= 1 && Number.isFinite(t.discountPercent))
    .filter((t) => t.discountPercent >= 0 && t.discountPercent <= 100)
    .sort((a, b) => a.minQty - b.minQty || (a.maxQty ?? 1e12) - (b.maxQty ?? 1e12));

  const raw = dropExcelOverlapPointTiers(parsed);

  // Résoudre les chevauchements (bandes continues type PRIX 2026)
  const resolved: AnsPalierTier[] = [];
  for (const t of raw) {
    const cur = { ...t };
    if (resolved.length) {
      const prev = resolved[resolved.length - 1]!;
      if (prev.maxQty != null && cur.minQty <= prev.maxQty) {
        // Nouveau palier commence dans la bande précédente → couper la précédente
        if (cur.minQty > prev.minQty) {
          prev.maxQty = cur.minQty - 1;
        } else if (cur.maxQty != null && (prev.maxQty == null || cur.maxQty < prev.maxQty)) {
          // Même min : point 0 % catalogue puis bande volume (ex. A0 : 1 @ 0 %, puis 1–10)
          const wide = { ...prev };
          prev.maxQty = cur.maxQty;
          prev.discountPercent = cur.discountPercent;
          cur.minQty = (cur.maxQty ?? cur.minQty) + 1;
          cur.maxQty = wide.maxQty;
          cur.discountPercent = wide.discountPercent;
        }
      }
      if (cur.maxQty != null && cur.maxQty < cur.minQty) continue;
      if (resolved.length && resolved[resolved.length - 1]!.maxQty == null) break;
    }
    if (cur.maxQty != null && cur.maxQty < cur.minQty) continue;
    resolved.push(cur);
  }

  // Enchaînement strict min = max préc. + 1
  for (let i = 1; i < resolved.length; i++) {
    const prev = resolved[i - 1]!;
    const cur = resolved[i]!;
    if (prev.maxQty != null) {
      cur.minQty = prev.maxQty + 1;
      if (cur.maxQty != null && cur.maxQty < cur.minQty) {
        cur.maxQty = cur.minQty;
      }
    }
  }

  for (let i = 0; i < resolved.length - 1; i++) {
    const cur = resolved[i]!;
    const next = resolved[i + 1]!;
    if (cur.maxQty == null || cur.maxQty >= next.minQty) {
      cur.maxQty = Math.max(cur.minQty, next.minQty - 1);
    }
  }

  return resolved.filter((t) => t.maxQty == null || t.maxQty >= t.minQty);
}
