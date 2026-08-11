/** Coins arrondis — sélection limitée par nombre de coins. */

export type CornerId = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const CORNER_ORDER: CornerId[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

export const CORNER_LABELS: Record<CornerId, string> = {
  'top-left': 'Haut gauche',
  'top-right': 'Haut droit',
  'bottom-left': 'Bas gauche',
  'bottom-right': 'Bas droit',
};

export type CornerRoundingState = {
  enabled: boolean;
  limit: number;
  selected: CornerId[];
};

export const CORNER_LIMIT_OPTIONS = [1, 2, 3, 4] as const;

export function emptyCornerRounding(limit = 2): CornerRoundingState {
  return { enabled: true, limit, selected: [] };
}

export function parseCornerRounding(raw: unknown): CornerRoundingState {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const limit = Number(o.limit) || 2;
    const selected = Array.isArray(o.selected)
      ? o.selected.filter((id): id is CornerId =>
          CORNER_ORDER.includes(id as CornerId),
        )
      : [];
    return {
      enabled: o.enabled !== false,
      limit: Math.min(4, Math.max(1, limit)),
      selected: selected.slice(0, limit),
    };
  }
  return emptyCornerRounding(2);
}

export function applyCornerLimitChange(
  state: CornerRoundingState,
  newLimit: number,
): { state: CornerRoundingState; adjusted: boolean } {
  const limit = Math.min(4, Math.max(1, newLimit));
  let selected = [...state.selected];
  let adjusted = false;
  if (selected.length > limit) {
    selected = selected.slice(0, limit);
    adjusted = true;
  }
  return { state: { ...state, limit, selected }, adjusted };
}

export function toggleCorner(
  state: CornerRoundingState,
  cornerId: CornerId,
): CornerRoundingState {
  const isSelected = state.selected.includes(cornerId);
  if (isSelected) {
    return {
      ...state,
      selected: state.selected.filter((id) => id !== cornerId),
    };
  }
  if (state.selected.length >= state.limit) {
    return state;
  }
  return { ...state, selected: [...state.selected, cornerId] };
}

export function isCornerRoundingComplete(state: CornerRoundingState): boolean {
  return state.selected.length === state.limit;
}

export function formatCornerRoundingSummary(state: CornerRoundingState): string {
  const labels = state.selected.map((id) => CORNER_LABELS[id]);
  return `${state.limit} coin${state.limit > 1 ? 's' : ''} : ${labels.join(', ')}`;
}

/** Legacy nb_coins + coins_arrondir → cornerRounding */
export function cornerRoundingFromLegacy(config: Record<string, unknown>): CornerRoundingState {
  if (config.cornerRounding) {
    return parseCornerRounding(config.cornerRounding);
  }
  const nbRaw = String(config.nb_coins ?? '');
  const limitMatch = nbRaw.match(/(\d+)/);
  const limit = limitMatch ? Number(limitMatch[1]) : 2;
  const legacyList = config.coins_arrondir;
  const selected: CornerId[] = [];
  if (Array.isArray(legacyList)) {
    for (const label of legacyList) {
      const id = Object.entries(CORNER_LABELS).find(([, l]) => l === label)?.[0] as CornerId | undefined;
      if (id) selected.push(id);
    }
  }
  return { enabled: true, limit, selected: selected.slice(0, limit) };
}
