export type QualiteChecklistItem = {
  key: string;
  label: string;
  checked: boolean;
  note?: string;
};

export type QualiteStatut =
  | 'En attente contrôle'
  | 'Conforme'
  | 'Non conforme'
  | 'A refaire'
  | 'Accepte avec reserve';

export const QUALITE_CHECKLIST_TEMPLATE: { key: string; label: string }[] = [
  { key: 'fichier_conforme', label: 'Fichier conforme' },
  { key: 'bat_respecte', label: 'BAT respecté' },
  { key: 'dimensions_correctes', label: 'Dimensions correctes' },
  { key: 'unite_correcte', label: 'Unité correcte (cm / mm / m²)' },
  { key: 'quantite_correcte', label: 'Quantité correcte' },
  { key: 'couleur_correcte', label: 'Couleur correcte' },
  { key: 'finition_correcte', label: 'Finition correcte' },
  { key: 'coupe_correcte', label: 'Coupe correcte' },
  { key: 'reliure_correcte', label: 'Reliure correcte' },
  { key: 'oeillets_corrects', label: 'Œillets corrects' },
  { key: 'emballage_correct', label: 'Emballage correct' },
  { key: 'etiquette_correcte', label: 'Étiquette correcte' },
  { key: 'livraison_prete', label: 'Livraison prête' },
];

export function buildDefaultChecklist(): QualiteChecklistItem[] {
  return QUALITE_CHECKLIST_TEMPLATE.map((item) => ({
    key: item.key,
    label: item.label,
    checked: false,
  }));
}

export function normalizeChecklist(raw: unknown): QualiteChecklistItem[] {
  const defaults = buildDefaultChecklist();
  if (!Array.isArray(raw)) return defaults;

  const byKey = new Map<string, QualiteChecklistItem>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.key !== 'string') continue;
    byKey.set(o.key, {
      key: o.key,
      label: typeof o.label === 'string' ? o.label : o.key,
      checked: Boolean(o.checked),
      note: typeof o.note === 'string' ? o.note : undefined,
    });
  }

  return defaults.map((d) => byKey.get(d.key) ?? d);
}

export function checklistProgress(items: QualiteChecklistItem[]): { checked: number; total: number; percent: number } {
  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  return { checked, total, percent: total > 0 ? Math.round((checked / total) * 100) : 0 };
}

export function isChecklistComplete(items: QualiteChecklistItem[]): boolean {
  return items.length > 0 && items.every((i) => i.checked);
}
