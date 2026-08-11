/** Œillets bâche — modes automatiques et placement manuel dynamique sur le contour. */

export type LegacyEyeletPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type DynamicEyeletPosition = {
  id: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  x: number;
  y: number;
  label: string;
};

export type BacheEyeletsData = {
  mode: string;
  count?: number;
  customCount?: number;
  positions?: string[] | string;
  unitPrice?: number;
  total?: number;
};

export const BACHE_EYELET_MODES = [
  'Aucun',
  'Aux coins',
  'Tous les 50 cm',
  'Tous les 1 m',
  'Nombre personnalisé',
  'Placement manuel',
] as const;

/** @deprecated — anciennes positions fixes (8 points) */
export const EYELET_MANUAL_POSITIONS: LegacyEyeletPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export const EYELET_POSITION_LABELS: Record<LegacyEyeletPosition, string> = {
  'top-left': 'Haut gauche',
  'top-center': 'Haut centre',
  'top-right': 'Haut droit',
  'middle-left': 'Milieu gauche',
  'middle-right': 'Milieu droit',
  'bottom-left': 'Bas gauche',
  'bottom-center': 'Bas centre',
  'bottom-right': 'Bas droit',
};

/** Minimum de points cliquables par côté (audit GF / bâche). */
export const MIN_EYELET_POINTS_PER_SIDE = 20;

export function getEyeletGridDensity(params: {
  longueurM: number;
  largeurM: number;
}): { horizontalPoints: number; verticalPoints: number } {
  const l = Math.max(0.1, params.longueurM);
  const w = Math.max(0.1, params.largeurM);
  const fromSize = {
    horizontalPoints: Math.max(MIN_EYELET_POINTS_PER_SIDE, Math.min(40, Math.ceil(l * 2))),
    verticalPoints: Math.max(MIN_EYELET_POINTS_PER_SIDE, Math.min(40, Math.ceil(w * 2))),
  };
  return {
    horizontalPoints: Math.max(MIN_EYELET_POINTS_PER_SIDE, fromSize.horizontalPoints),
    verticalPoints: Math.max(MIN_EYELET_POINTS_PER_SIDE, fromSize.verticalPoints),
  };
}

export function generateEyeletPositions(params: {
  longueurM: number;
  largeurM: number;
  horizontalPoints?: number;
  verticalPoints?: number;
}): DynamicEyeletPosition[] {
  const { horizontalPoints, verticalPoints } = getEyeletGridDensity(params);
  const hPts = params.horizontalPoints ?? horizontalPoints;
  const vPts = params.verticalPoints ?? verticalPoints;
  const positions: DynamicEyeletPosition[] = [];

  for (let i = 0; i < hPts; i++) {
    const x = hPts === 1 ? 0.5 : i / (hPts - 1);
    positions.push({
      id: `top-${i}`,
      side: 'top',
      x,
      y: 0,
      label: `Haut ${i + 1}`,
    });
    positions.push({
      id: `bottom-${i}`,
      side: 'bottom',
      x,
      y: 1,
      label: `Bas ${i + 1}`,
    });
  }

  for (let i = 1; i < vPts - 1; i++) {
    const y = i / (vPts - 1);
    positions.push({
      id: `left-${i}`,
      side: 'left',
      x: 0,
      y,
      label: `Gauche ${i + 1}`,
    });
    positions.push({
      id: `right-${i}`,
      side: 'right',
      x: 1,
      y,
      label: `Droite ${i + 1}`,
    });
  }

  return positions;
}

export function eyeletPositionLabel(id: string): string {
  if (id in EYELET_POSITION_LABELS) {
    return EYELET_POSITION_LABELS[id as LegacyEyeletPosition];
  }
  const m = id.match(/^(top|bottom|left|right)-(\d+)$/);
  if (m) {
    const sideLabels: Record<string, string> = {
      top: 'Haut',
      bottom: 'Bas',
      left: 'Gauche',
      right: 'Droite',
    };
    return `${sideLabels[m[1]] ?? m[1]} ${parseInt(m[2], 10) + 1}`;
  }
  return id;
}

export function formatEyeletPositionsSummary(positions: string[], maxShown = 8): string {
  if (positions.length === 0) return '';
  const labels = positions.map(eyeletPositionLabel);
  if (labels.length <= maxShown) return labels.join(', ');
  return `${labels.slice(0, maxShown).join(', ')} + ${labels.length - maxShown} autres`;
}

export function getEyeletBulkSelection(
  type: 'corners' | 'top_bottom' | 'perimeter',
  longueurM: number,
  largeurM: number,
): string[] {
  const grid = generateEyeletPositions({ longueurM, largeurM });
  const { horizontalPoints } = getEyeletGridDensity({ longueurM, largeurM });
  const lastH = horizontalPoints - 1;

  if (type === 'corners') {
    return [`top-0`, `top-${lastH}`, `bottom-0`, `bottom-${lastH}`];
  }
  if (type === 'top_bottom') {
    return grid.filter((p) => p.side === 'top' || p.side === 'bottom').map((p) => p.id);
  }
  return grid.map((p) => p.id);
}

/** Point d’aperçu œillet (coords normalisées 0–1). */
export type EyeletPreviewPoint = {
  id: string;
  x: number;
  y: number;
  label: string;
};

/** Coins uniquement (légèrement rentrés pour l’aperçu). */
export function generateCornerEyeletPreview(): EyeletPreviewPoint[] {
  return [
    { id: 'corner-tl', x: 0, y: 0, label: 'Haut gauche' },
    { id: 'corner-tr', x: 1, y: 0, label: 'Haut droit' },
    { id: 'corner-br', x: 1, y: 1, label: 'Bas droit' },
    { id: 'corner-bl', x: 0, y: 1, label: 'Bas gauche' },
  ];
}

/** IDs grille des 4 coins (toujours obligatoires hors mode « Aucun »). */
export function getMandatoryCornerIds(longueurM: number, largeurM: number): string[] {
  return getEyeletBulkSelection('corners', longueurM, largeurM);
}

export function ensureMandatoryCornerIds(
  positions: string[],
  longueurM: number,
  largeurM: number,
): string[] {
  const corners = getMandatoryCornerIds(longueurM, largeurM);
  const set = new Set([...corners, ...positions.map(String)]);
  return [...set];
}

export function isMandatoryCornerId(
  id: string,
  longueurM: number,
  largeurM: number,
): boolean {
  return getMandatoryCornerIds(longueurM, largeurM).includes(id);
}

type EdgeSpec = {
  side: 'top' | 'right' | 'bottom' | 'left';
  len: number;
  pointAt: (t: number) => { x: number; y: number };
};

function perimeterEdges(longueurM: number, largeurM: number): EdgeSpec[] {
  const L = Math.max(0.01, longueurM);
  const W = Math.max(0.01, largeurM);
  return [
    { side: 'top', len: L, pointAt: (t) => ({ x: t, y: 0 }) },
    { side: 'right', len: W, pointAt: (t) => ({ x: 1, y: t }) },
    { side: 'bottom', len: L, pointAt: (t) => ({ x: 1 - t, y: 1 }) },
    { side: 'left', len: W, pointAt: (t) => ({ x: 0, y: 1 - t }) },
  ];
}

/** Fractions 0–1 strictement entre les coins, tous les `stepM` m. */
function intermediateFractionsOnEdge(edgeLenM: number, stepM: number): number[] {
  const step = Math.max(0.05, stepM);
  const fracs: number[] = [];
  for (let d = step; d < edgeLenM - 1e-9; d += step) {
    fracs.push(Math.min(0.999, Math.max(0.001, d / edgeLenM)));
  }
  return fracs;
}

/**
 * Répartit N œillets sur le périmètre avec les 4 coins toujours inclus.
 * Si N < 4 et N > 0 → 4 coins. Si N === 0 → aucun.
 */
export function distributeEyeletsOnPerimeter(
  longueurM: number,
  largeurM: number,
  count: number,
): EyeletPreviewPoint[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];

  const corners = generateCornerEyeletPreview();
  if (n <= 4) return corners;

  const edges = perimeterEdges(longueurM, largeurM);
  const remaining = n - 4;
  const totalLen = edges.reduce((s, e) => s + e.len, 0);

  // Répartition proportionnelle (plus grand reste) des œillets intermédiaires
  const raw = edges.map((e) => (remaining * e.len) / totalLen);
  const quotas = raw.map((v) => Math.floor(v));
  let left = remaining - quotas.reduce((s, v) => s + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < left; k++) {
    quotas[order[k % order.length].i] += 1;
  }

  const points: EyeletPreviewPoint[] = [...corners];
  let idx = 0;
  edges.forEach((edge, ei) => {
    const q = quotas[ei];
    for (let j = 1; j <= q; j++) {
      const t = j / (q + 1);
      const { x, y } = edge.pointAt(t);
      const sideLabel =
        edge.side === 'top'
          ? 'Haut'
          : edge.side === 'right'
            ? 'Droite'
            : edge.side === 'bottom'
              ? 'Bas'
              : 'Gauche';
      points.push({
        id: `peri-${idx++}`,
        x,
        y,
        label: `${sideLabel} ${j}`,
      });
    }
  });
  return points;
}

/**
 * Œillets tous les `stepM` m sur chaque côté — les 4 coins sont toujours inclus.
 */
export function generateSpacedPerimeterEyelets(
  longueurM: number,
  largeurM: number,
  stepM: number,
): EyeletPreviewPoint[] {
  const corners = generateCornerEyeletPreview();
  const points: EyeletPreviewPoint[] = [...corners];
  let idx = 0;

  for (const edge of perimeterEdges(longueurM, largeurM)) {
    const fracs = intermediateFractionsOnEdge(edge.len, stepM);
    fracs.forEach((t, j) => {
      const { x, y } = edge.pointAt(t);
      const sideLabel =
        edge.side === 'top'
          ? 'Haut'
          : edge.side === 'right'
            ? 'Droite'
            : edge.side === 'bottom'
              ? 'Bas'
              : 'Gauche';
      points.push({
        id: `peri-${idx++}`,
        x,
        y,
        label: `${sideLabel} ${j + 1}`,
      });
    });
  }
  return points;
}

/** Positions d’aperçu selon le mode œillets. */
export function resolveEyeletPreviewPoints(params: {
  mode: string;
  longueurM: number;
  largeurM: number;
  customCount?: number;
  manualPositions?: string[];
}): EyeletPreviewPoint[] {
  const mode = params.mode || 'Aucun';
  if (!mode || mode === 'Aucun') return [];

  if (mode === 'Aux coins') return generateCornerEyeletPreview();

  if (mode === 'Tous les 50 cm') {
    return generateSpacedPerimeterEyelets(params.longueurM, params.largeurM, 0.5);
  }
  if (mode === 'Tous les 1 m') {
    return generateSpacedPerimeterEyelets(params.longueurM, params.largeurM, 1);
  }
  if (mode === 'Nombre personnalisé') {
    const n = Math.max(4, Number(params.customCount || 0));
    return distributeEyeletsOnPerimeter(params.longueurM, params.largeurM, n);
  }
  if (mode === 'Placement manuel') {
    const grid = generateEyeletPositions({
      longueurM: params.longueurM,
      largeurM: params.largeurM,
    });
    const selected = new Set(
      ensureMandatoryCornerIds(
        params.manualPositions ?? [],
        params.longueurM,
        params.largeurM,
      ),
    );
    return grid
      .filter((p) => selected.has(p.id))
      .map((p) => ({ id: p.id, x: p.x, y: p.y, label: p.label }));
  }
  return [];
}

export function parseBacheEyelets(raw: unknown): BacheEyeletsData {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const o = raw as BacheEyeletsData;
    return {
      mode: o.mode ?? 'Aucun',
      count: o.count,
      customCount: o.customCount,
      positions: o.positions,
      unitPrice: o.unitPrice,
      total: o.total,
    };
  }
  if (typeof raw === 'string' && raw) {
    return { mode: raw, count: 0, positions: [] };
  }
  return { mode: 'Aucun', count: 0, positions: [] };
}

export function computeEyelets(params: {
  mode: string;
  longueurM: number;
  largeurM: number;
  customCount?: number;
  manualPositions?: string[];
  unitPrice?: number;
}): {
  count: number;
  positions: string[] | string;
  modeLabel: string;
  unitPrice: number;
  total: number;
} {
  const unitPrice = params.unitPrice ?? 500;
  const mode = params.mode || 'Aucun';

  if (!mode || mode === 'Aucun') {
    return { count: 0, positions: [], modeLabel: 'Aucun', unitPrice, total: 0 };
  }

  if (mode === 'Aux coins') {
    const positions = getEyeletBulkSelection('corners', params.longueurM, params.largeurM);
    return {
      count: 4,
      positions,
      modeLabel: 'Aux coins',
      unitPrice,
      total: 4 * unitPrice,
    };
  }

  if (mode === 'Tous les 1 m') {
    const pts = generateSpacedPerimeterEyelets(params.longueurM, params.largeurM, 1);
    const count = pts.length;
    return {
      count,
      positions: pts.map((p) => p.id),
      modeLabel: 'Tous les 1 m',
      unitPrice,
      total: count * unitPrice,
    };
  }

  if (mode === 'Tous les 50 cm') {
    const pts = generateSpacedPerimeterEyelets(params.longueurM, params.largeurM, 0.5);
    const count = pts.length;
    return {
      count,
      positions: pts.map((p) => p.id),
      modeLabel: 'Tous les 50 cm',
      unitPrice,
      total: count * unitPrice,
    };
  }

  if (mode === 'Nombre personnalisé') {
    const count = Math.max(4, Number(params.customCount || 0));
    const pts = distributeEyeletsOnPerimeter(params.longueurM, params.largeurM, count);
    return {
      count: pts.length,
      positions: pts.map((p) => p.id),
      modeLabel: 'Nombre personnalisé',
      unitPrice,
      total: pts.length * unitPrice,
    };
  }

  if (mode === 'Placement manuel') {
    const positions = ensureMandatoryCornerIds(
      params.manualPositions ?? [],
      params.longueurM,
      params.largeurM,
    );
    const count = positions.length;
    return {
      count,
      positions,
      modeLabel: 'Placement manuel',
      unitPrice,
      total: count * unitPrice,
    };
  }

  // Legacy modes
  if (mode === '4 œillets / m²') {
    const surface = params.longueurM * params.largeurM;
    const count = Math.ceil(surface * 4);
    return { count, positions: 'legacy_4m2', modeLabel: mode, unitPrice, total: count * unitPrice };
  }
  if (mode === '8 œillets / m²') {
    const surface = params.longueurM * params.largeurM;
    const count = Math.ceil(surface * 8);
    return { count, positions: 'legacy_8m2', modeLabel: mode, unitPrice, total: count * unitPrice };
  }

  return { count: 0, positions: [], modeLabel: mode, unitPrice, total: 0 };
}

export function eyeletsFromConfig(
  config: Record<string, unknown>,
  longueurM: number,
  largeurM: number,
  unitPrice?: number,
): ReturnType<typeof computeEyelets> {
  const legacyMode = String(config.oeillets ?? config.oeillets_mode ?? '');
  const data = parseBacheEyelets(config.oeillets_data ?? (legacyMode ? { mode: legacyMode } : null));

  const manualPositions = Array.isArray(data.positions)
    ? data.positions.map(String)
    : undefined;

  return computeEyelets({
    mode: data.mode,
    longueurM,
    largeurM,
    customCount: data.customCount ?? data.count ?? Number(config.oeillets_custom ?? 0),
    manualPositions,
    unitPrice: unitPrice ?? data.unitPrice,
  });
}
