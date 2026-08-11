/**
 * Grille commerciale PRIX 2026 — onglet « Carte de visite ».
 * Prix unitaire pièce (Ar) selon face × support × palier quantité.
 * Source fichier : PRIX 2026.xlsx (ne pas recalculer via ISF feuille).
 */

export type CarteVisiteFace = 'recto' | 'recto_verso';

export type CarteVisiteGridColumn =
  | 'pcb_standard'
  | 'pcb_350'
  | 'pcb_600'
  | 'toile_fin'
  | 'invitation'
  | 'pellicule_320'
  | 'pellicule_370'
  | 'pvc_translucide'
  | 'pvc_opaque';

export const CARTE_VISITE_GRID_COLUMN_LABELS: Record<CarteVisiteGridColumn, string> = {
  pcb_standard: 'PCB / Glossy / PCM / Tissu texturé',
  pcb_350: 'PCB 350G',
  pcb_600: 'PCB 600G',
  toile_fin: 'Toile fin',
  invitation: 'Invitation',
  pellicule_320: 'Pelliculé brillant / mat 320G',
  pellicule_370: 'Pelliculé brillant / mat 370G',
  pvc_translucide: 'PVC Translucide',
  pvc_opaque: 'PVC Opaque',
};

type QtyTier = { min: number; max: number | null; prices: Partial<Record<CarteVisiteGridColumn, number | null>> };

/** Recto — lignes Excel 3–7 */
const RECTO_TIERS: QtyTier[] = [
  {
    min: 50,
    max: 199,
    prices: {
      pcb_standard: 200,
      pcb_350: 350,
      pcb_600: 500,
      toile_fin: 300,
      invitation: 300,
      pellicule_320: 450,
      pellicule_370: 600,
      pvc_translucide: 500,
      pvc_opaque: 1300,
    },
  },
  {
    min: 200,
    max: 999,
    prices: {
      pcb_standard: 175,
      pcb_350: 300,
      pcb_600: 450,
      toile_fin: 250,
      invitation: 250,
      pellicule_320: 400,
      pellicule_370: 550,
      pvc_translucide: 450,
      pvc_opaque: 1200,
    },
  },
  {
    min: 1000,
    max: 4999,
    prices: {
      pcb_standard: 150,
      pcb_350: 275,
      pcb_600: 400,
      toile_fin: 225,
      invitation: 225,
      pellicule_320: 350,
      pellicule_370: 500,
      pvc_translucide: 400,
      pvc_opaque: 1100,
    },
  },
  {
    min: 5000,
    max: 9999,
    prices: {
      pcb_standard: 125,
      pcb_350: 260,
      pcb_600: 350,
      toile_fin: 200,
      invitation: 200,
      pellicule_320: 300,
      pellicule_370: 450,
      pvc_translucide: 350,
      pvc_opaque: 1000,
    },
  },
  {
    min: 10000,
    max: null,
    prices: {
      pcb_standard: 100,
      pcb_350: 250,
      pcb_600: 300,
      toile_fin: 150,
      invitation: 150,
      pellicule_320: 250,
      pellicule_370: 400,
      pvc_translucide: 300,
      pvc_opaque: 800,
    },
  },
];

/** Recto/Verso — lignes Excel 13–17 (« - » = non disponible) */
const RECTO_VERSO_TIERS: QtyTier[] = [
  {
    min: 50,
    max: 199,
    prices: {
      pcb_standard: 350,
      pcb_350: 550,
      pcb_600: 750,
      toile_fin: 450,
      invitation: 450,
      pellicule_320: 700,
      pellicule_370: 900,
      pvc_translucide: null,
      pvc_opaque: 1500,
    },
  },
  {
    min: 200,
    max: 999,
    prices: {
      pcb_standard: 300,
      pcb_350: 500,
      pcb_600: 700,
      toile_fin: 400,
      invitation: 400,
      pellicule_320: 650,
      pellicule_370: 800,
      pvc_translucide: null,
      pvc_opaque: 1300,
    },
  },
  {
    min: 1000,
    max: 4999,
    prices: {
      pcb_standard: 250,
      pcb_350: 450,
      pcb_600: 650,
      toile_fin: 350,
      invitation: 350,
      pellicule_320: 550,
      pellicule_370: 750,
      pvc_translucide: null,
      pvc_opaque: 1200,
    },
  },
  {
    min: 5000,
    max: 9999,
    prices: {
      pcb_standard: 200,
      pcb_350: 400,
      pcb_600: 550,
      toile_fin: 300,
      invitation: 300,
      pellicule_320: 450,
      pellicule_370: 700,
      pvc_translucide: null,
      pvc_opaque: 1100,
    },
  },
  {
    min: 10000,
    max: null,
    prices: {
      pcb_standard: 150,
      pcb_350: 350,
      pcb_600: 450,
      toile_fin: 250,
      invitation: 250,
      pellicule_320: 400,
      pellicule_370: 600,
      pvc_translucide: null,
      pvc_opaque: 1000,
    },
  },
];

function parseGrammageG(raw: string): number | null {
  const m = String(raw ?? '').replace(/\s/g, '').match(/(\d+)\s*g/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function optionOn(raw: unknown): boolean {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return false;
  if (/^(non|no|sans|0|false|off|bord\s*carr)/i.test(s)) return false;
  if (/oui|yes|avec|1|true|on|mat|brillant|rect|verso|arrondi/i.test(s)) return true;
  return s.length > 0 && !/aucun|none|—|-/i.test(s);
}

export function resolveCarteVisiteFace(faceRaw: string): CarteVisiteFace {
  return /verso|r\s*\/\s*v|rect[o-]?\s*verso/i.test(faceRaw) ? 'recto_verso' : 'recto';
}

/**
 * Mappe matière / grammage / pelliculage POS → colonne Excel.
 */
export function resolveCarteVisiteGridColumn(config: {
  matiere?: unknown;
  grammage?: unknown;
  pelliculage?: unknown;
  finition_pelliculage?: unknown;
  finitions?: unknown;
}): CarteVisiteGridColumn | null {
  const matiere = String(config.matiere ?? '').trim();
  const grammage = String(config.grammage ?? '').trim();
  const g = parseGrammageG(grammage);
  const pellOn =
    optionOn(config.pelliculage)
    || optionOn(config.finition_pelliculage)
    || /pellicul/i.test(String(config.finitions ?? ''));

  if (/pvc.*opaque|opaque.*pvc/i.test(matiere)) return 'pvc_opaque';
  if (/pvc.*translucide|translucide.*pvc/i.test(matiere)) return 'pvc_translucide';
  if (/toile\s*fin/i.test(matiere)) return 'toile_fin';
  if (/invitation/i.test(matiere)) return 'invitation';

  // Papier pelliculé mat/brillant → colonne pellicule (pelliculage déjà inclus dans le prix)
  if (/pellicul/i.test(matiere)) {
    if (g != null && g >= 350) return 'pellicule_370';
    if (/370/i.test(grammage) || /370/i.test(matiere)) return 'pellicule_370';
    return 'pellicule_320';
  }
  if (pellOn) {
    if (g != null && g >= 350) return 'pellicule_370';
    if (/370/i.test(grammage)) return 'pellicule_370';
    return 'pellicule_320';
  }

  // Papier standard : PCB, PCM, Glossy, Bristol, Texturé, Kraft (même grille que PCB)
  if (/pcb|pcm|glossy|bristol|kraft|textur/i.test(matiere) || !matiere) {
    if (g != null && g >= 550) return 'pcb_600';
    if (g != null && g >= 340 && g < 550) return 'pcb_350';
    if (/600/i.test(grammage)) return 'pcb_600';
    if (/350/i.test(grammage)) return 'pcb_350';
    return 'pcb_standard';
  }

  // Fallback : toute matière papier non PVC et non reconnue → grille PCB standard
  return 'pcb_standard';
}

export type CarteVisiteExcelLookup = {
  calculable: boolean;
  surDevis: boolean;
  missingField?: string;
  face: CarteVisiteFace;
  column: CarteVisiteGridColumn | null;
  columnLabel: string | null;
  tierLabel: string | null;
  unitPrice: number;
  qty: number;
};

function findTier(tiers: QtyTier[], qty: number): QtyTier | null {
  const q = Math.max(1, Math.floor(qty));
  // Sous le minimum commercial (50) → premier palier
  if (q < 50) return tiers[0] ?? null;
  return tiers.find((t) => q >= t.min && (t.max == null || q <= t.max)) ?? tiers[tiers.length - 1] ?? null;
}

function tierLabel(t: QtyTier): string {
  if (t.max == null) return `${t.min.toLocaleString('fr-FR')}+`;
  return `${t.min.toLocaleString('fr-FR')} – ${t.max.toLocaleString('fr-FR')}`;
}

/**
 * Lignes Admin / détail matière — prix d’entrée recto qty 50–199 par colonne grille.
 */
export function listCarteVisiteEntryPriceRows(): Array<{
  column: CarteVisiteGridColumn;
  label: string;
  unitPrice: number;
  face: 'recto';
  qtyMin: number;
}> {
  const entry = RECTO_TIERS[0];
  const rows: Array<{
    column: CarteVisiteGridColumn;
    label: string;
    unitPrice: number;
    face: 'recto';
    qtyMin: number;
  }> = [];
  for (const column of Object.keys(CARTE_VISITE_GRID_COLUMN_LABELS) as CarteVisiteGridColumn[]) {
    const unitPrice = entry?.prices[column];
    if (unitPrice == null || !Number.isFinite(unitPrice) || unitPrice <= 0) continue;
    rows.push({
      column,
      label: CARTE_VISITE_GRID_COLUMN_LABELS[column],
      unitPrice,
      face: 'recto',
      qtyMin: entry.min,
    });
  }
  return rows;
}

/** Min / max sur toutes les cellules chiffrées (recto + recto/verso, tous paliers). */
export function getCarteVisitePrix2026GridRange(): { min: number; max: number } {
  const values: number[] = [];
  const scan = (tiers: QtyTier[]) => {
    for (const tier of tiers) {
      for (const p of Object.values(tier.prices)) {
        if (p != null && Number.isFinite(p) && p > 0) values.push(p);
      }
    }
  };
  scan(RECTO_TIERS);
  scan(RECTO_VERSO_TIERS);
  return { min: Math.min(...values), max: Math.max(...values) };
}

export const CARTE_VISITE_PRIX_2026_ADMIN_HINT =
  'Grille PRIX 2026 — matière × face × quantité (50–10 000+). Ex. PCB recto 50 = 200 Ar · PVC opaque recto 50 = 1 300 Ar · PVC opaque R/V 50 = 1 500 Ar';

export function lookupCarteVisiteExcelUnitPrice(
  config: Record<string, unknown>,
  qtyRaw = 50,
): CarteVisiteExcelLookup {
  const qty = Math.max(1, Math.floor(Number(qtyRaw) || 1));
  const enriched: Record<string, unknown> = {
    ...config,
    matiere: config.matiere ?? config.material ?? config.paperType ?? config.support,
    grammage: config.grammage ?? config.paperWeight ?? config.paper_weight,
  };
  const face = resolveCarteVisiteFace(String(enriched.face ?? config.face ?? ''));
  const column = resolveCarteVisiteGridColumn(enriched);

  if (!String(enriched.face ?? config.face ?? '').trim()) {
    return {
      calculable: false,
      surDevis: false,
      missingField: 'face',
      face,
      column,
      columnLabel: null,
      tierLabel: null,
      unitPrice: 0,
      qty,
    };
  }
  if (!String(enriched.matiere ?? '').trim()) {
    return {
      calculable: false,
      surDevis: false,
      missingField: 'matiere',
      face,
      column,
      columnLabel: null,
      tierLabel: null,
      unitPrice: 0,
      qty,
    };
  }
  if (!column) {
    return {
      calculable: false,
      surDevis: true,
      missingField: 'matiere',
      face,
      column: null,
      columnLabel: null,
      tierLabel: null,
      unitPrice: 0,
      qty,
    };
  }

  const tiers = face === 'recto_verso' ? RECTO_VERSO_TIERS : RECTO_TIERS;
  const tier = findTier(tiers, qty);
  const raw = tier?.prices[column];
  if (raw == null || !Number.isFinite(raw) || raw <= 0) {
    return {
      calculable: false,
      surDevis: true,
      missingField: 'impression',
      face,
      column,
      columnLabel: CARTE_VISITE_GRID_COLUMN_LABELS[column],
      tierLabel: tier ? tierLabel(tier) : null,
      unitPrice: 0,
      qty,
    };
  }

  return {
    calculable: true,
    surDevis: false,
    face,
    column,
    columnLabel: CARTE_VISITE_GRID_COLUMN_LABELS[column],
    tierLabel: tier ? tierLabel(tier) : null,
    unitPrice: Math.round(raw),
    qty,
  };
}
