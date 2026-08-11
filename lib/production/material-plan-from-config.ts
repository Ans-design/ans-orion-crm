/** Extrait besoins matière depuis configSnapshot commande (sans I/O). */

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function pick(config: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const val = config[k];
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
  }
  return null;
}

export type MaterialNeedFromConfig = {
  papier: string;
  qtePapier: string;
  encre: string;
  qteEncre: string;
  matieres: string[];
};

export function extractMaterialNeedFromConfig(
  snapshot: unknown,
  qty: number,
): MaterialNeedFromConfig {
  const config = asRecord(snapshot);
  const papier =
    pick(config, [
      'matiere', 'material', 'matiere_label', 'matiere_int', 'paperType', 'type_bache', 'support',
    ]) ?? '—';
  const grammage = pick(config, ['grammage', 'grammage_label', 'paperWeight']);
  const encre =
    pick(config, ['encre', 'ink', 'impression', 'recto_verso', 'faces', 'couleur']) ?? '—';

  const matieres = [papier, grammage].filter((x): x is string => Boolean(x) && x !== '—');

  return {
    papier: grammage && papier !== '—' ? `${papier} ${grammage}` : papier,
    qtePapier: qty > 0 && papier !== '—' ? String(qty) : '—',
    encre,
    qteEncre: encre !== '—' && qty > 0 ? 'selon job' : '—',
    matieres,
  };
}
