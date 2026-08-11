/**
 * Prix catalogue (1ʳᵉ ligne format) issus de docs/references/PRIX-2026.xlsx
 * — PU après remise % sur les paliers GF.
 * « Gros lot » = à discuter → non importé.
 */

export const PRIX_2026_GF_LIST_BY_SHEET: Record<string, Record<string, number>> = {
  'Bache 180 cm': { a4: 2200, a3: 4000, a2: 7000, a1: 12000, a0: 20000 },
  'Bache 240  et 320 cm& dos blanc': { a0: 30000 },
  'Vinyle blanc 150 cm': { a4: 2200, a3: 4000, a2: 7000, a1: 12000, a0: 20000 },
  'vinyle transparent': { a4: 2200, a3: 4000, a2: 7000, a1: 12000, a0: 20000 },
  'Papier dos bleu': { a4: 2200, a3: 4000, a2: 7000, a1: 12000, a0: 20000 },
  'Oneway Vision': { a4: 3000, a3: 5500, a2: 10000, a1: 18000, a0: 30000 },
  'Frosted film sablé': { a4: 2200, a3: 4000, a2: 7000, a1: 12000, a0: 20000 },
  'Autocollant reflechissant': { a4: 2200, a3: 4000, a2: 7000, a1: 12000, a0: 20000 },
  'P P Indechirable grand format': { a4: 2200, a3: 4000, a2: 7000, a1: 12000, a0: 20000 },
  'P PHOTO GRAND FORMAT': { a4: 2200, a3: 4000, a2: 7000, a1: 12000, a0: 20000 },
  'Tissus drapeau': { a0: 30000 },
};

/** Entrée catalogue recto PVC / Plexi (PRIX 2026) — clé = variantKey sans __art-*. */
export const PRIX_2026_RIGID_LIST: Record<string, number> = {
  'pvc-3mm-a4': 15000,
  'pvc-3mm-a3': 20000,
  'pvc-3mm-a2': 30000,
  'pvc-3mm-a1': 60000,
  'pvc-3mm-a0': 110000,
  'pvc-5mm-a4': 20000,
  'pvc-5mm-a3': 30000,
  'pvc-5mm-a2': 47000,
  'pvc-5mm-a1': 90000,
  'pvc-5mm-a0': 160000,
  'plexi-3mm-a4': 23000,
  'plexi-3mm-a3': 35000,
  'plexi-3mm-a2': 55000,
  'plexi-3mm-a1': 105000,
  'plexi-3mm-a0': 200000,
  'plexi-5mm-a4': 28000,
  'plexi-5mm-a3': 45000,
  'plexi-5mm-a2': 70000,
  'plexi-5mm-a1': 130000,
  'plexi-5mm-a0': 240000,
};

/** Recto/verso — grilles Excel secondaires (souvent importées en __art-*). */
export const PRIX_2026_RIGID_RV_LIST: Record<string, number> = {
  'pvc-3mm-a4': 29000,
  'pvc-3mm-a3': 38000,
  'pvc-3mm-a2': 57000,
  'pvc-3mm-a1': 114000,
  'pvc-3mm-a0': 200000,
  'pvc-5mm-a4': 35000,
  'pvc-5mm-a3': 48000,
  'pvc-5mm-a2': 74000,
  'pvc-5mm-a1': 145000,
  'pvc-5mm-a0': 250000,
  'plexi-3mm-a4': 37000,
  'plexi-3mm-a3': 53000,
  'plexi-3mm-a2': 82000,
  'plexi-3mm-a1': 160000,
  'plexi-3mm-a0': 285000,
  'plexi-5mm-a4': 42000,
  'plexi-5mm-a3': 63000,
  'plexi-5mm-a2': 97000,
  'plexi-5mm-a1': 185000,
  'plexi-5mm-a0': 325000,
};

/** Article ORION → onglet Excel souple (hors PVC/Plexi). */
export const GF_ARTICLE_DEFAULT_SHEET: Record<string, string> = {
  'gf-bache': 'Bache 180 cm',
  'gf-vinyl-blanc': 'Vinyle blanc 150 cm',
  'gf-vinyl-transp': 'vinyle transparent',
  'gf-dosbleu': 'Papier dos bleu',
  'gf-oneway': 'Oneway Vision',
  'gf-frosted': 'Frosted film sablé',
  'gf-reflechissant': 'Autocollant reflechissant',
  'gf-pp': 'P P Indechirable grand format',
  'gf-photo': 'P PHOTO GRAND FORMAT',
  'gf-tissu': 'Tissus drapeau',
};

const SHEET_ALIASES: Record<string, string> = {
  'bache 180 cm': 'Bache 180 cm',
  'bâche 180 cm': 'Bache 180 cm',
  'bache 240 et 320 cm& dos blanc': 'Bache 240  et 320 cm& dos blanc',
  'bache 240  et 320 cm& dos blanc': 'Bache 240  et 320 cm& dos blanc',
  'bâche 240 et 320 cm& dos blanc': 'Bache 240  et 320 cm& dos blanc',
};

export function normalizeGfExcelSheetName(family: string): string {
  const raw = String(family || '').trim();
  if (!raw) return raw;
  if (PRIX_2026_GF_LIST_BY_SHEET[raw]) return raw;
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  const alias = SHEET_ALIASES[collapsed.toLowerCase()];
  if (alias) return alias;
  if (/bache.*240|320.*dos\s*blanc/i.test(collapsed)) {
    return 'Bache 240  et 320 cm& dos blanc';
  }
  if (/bache.*180/i.test(collapsed)) return 'Bache 180 cm';
  return raw;
}

export function stripArtSuffix(variantKey: string): string {
  return String(variantKey || '').replace(/__art-[a-z0-9-]+$/i, '');
}

/** Extrait la clé format (a4, a3…) depuis variantKey / libellé variante. */
export function formatKeyFromVariant(variantKeyOrLabel: string): string | null {
  const s = stripArtSuffix(variantKeyOrLabel).toLowerCase();
  const laizeFmt = s.match(/^(?:180|240-320)__(a[0-4])(?:$|__)/);
  if (laizeFmt) return laizeFmt[1]!;
  if (/^(?:bache-)?240-320/.test(s) || (/240.?320/.test(s) && !/a[1-4]/.test(s))) return 'a0';
  const rigid = s.match(/^(?:pvc|plexi)-\d+mm-(a[0-4])$/);
  if (rigid) return rigid[1]!;
  const head = s.match(/^(a[0-4])(?:__|$|[^a-z0-9])/);
  if (head) return head[1]!;
  const label = s.match(/(?:^|[^a-z0-9])(a[0-4])(?:[^a-z0-9]|$)/);
  return label?.[1] ?? null;
}

export function bacheSheetFromVariantKey(variantKey: string): string | null {
  const k = variantKey.toLowerCase();
  if (/240-320|bache-240/.test(k)) return 'Bache 240  et 320 cm& dos blanc';
  if (/^180__|bache-180|__180\b/.test(k) || /a[0-4]__bache-180/.test(k)) {
    return 'Bache 180 cm';
  }
  return null;
}

export function listPriceForGfVariant(
  excelFamily: string,
  variantKey: string,
): number | null {
  const raw = String(variantKey || '');
  const key = stripArtSuffix(raw);
  const isRv = /__art-/i.test(raw) || /__rv\b|_rv$|recto\s*[\/&]\s*verso/i.test(raw);
  if (isRv && PRIX_2026_RIGID_RV_LIST[key]) return PRIX_2026_RIGID_RV_LIST[key]!;
  if (PRIX_2026_RIGID_LIST[key]) return PRIX_2026_RIGID_LIST[key]!;

  const fromKey = bacheSheetFromVariantKey(key);
  const sheet = normalizeGfExcelSheetName(fromKey || excelFamily);
  const byFormat = PRIX_2026_GF_LIST_BY_SHEET[sheet];
  if (!byFormat) return null;
  const fmt = formatKeyFromVariant(key) || (sheet.includes('240') ? 'a0' : null);
  if (!fmt) return null;
  return byFormat[fmt] ?? null;
}

/**
 * Résout le prix catalogue pour un article ORION + variante (source unique Admin/POS).
 */
export function resolveArticleVariantListPrice(
  articleId: string,
  variantKey: string,
  excelFamily?: string | null,
): number | null {
  const raw = String(variantKey || '');
  const key = stripArtSuffix(raw);
  const isRv = /__art-/i.test(raw) || /__rv\b|_rv$/i.test(raw);

  if (isRv && PRIX_2026_RIGID_RV_LIST[key]) return PRIX_2026_RIGID_RV_LIST[key]!;
  if (PRIX_2026_RIGID_LIST[key]) return PRIX_2026_RIGID_LIST[key]!;

  if (articleId === 'gf-bache' && (/240-320/.test(key) || key === 'bache-240-320')) {
    return PRIX_2026_GF_LIST_BY_SHEET['Bache 240  et 320 cm& dos blanc']!.a0;
  }

  const sheet =
    (excelFamily && normalizeGfExcelSheetName(excelFamily))
    || GF_ARTICLE_DEFAULT_SHEET[articleId]
    || '';
  if (sheet) {
    const fromSheet = listPriceForGfVariant(sheet, raw || key || 'a4');
    if (fromSheet != null) return fromSheet;
  }

  if (!key) {
    const defSheet = GF_ARTICLE_DEFAULT_SHEET[articleId];
    if (!defSheet) return null;
    const by = PRIX_2026_GF_LIST_BY_SHEET[defSheet];
    if (!by) return null;
    return by.a4 ?? by.a0 ?? null;
  }

  return listPriceForGfVariant(sheet, raw || key);
}

export function unitPriceFromRemise(listPrice: number, discountPercent: number): number {
  const raw = listPrice * (1 - discountPercent / 100);
  if (listPrice >= 1000) return Math.round(raw / 100) * 100;
  return Math.round(raw);
}
