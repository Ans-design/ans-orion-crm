/** Matières retirées du POS actif — conservées en snapshot historique uniquement. */
const RETIRED_MATERIAL_LABELS = new Set([
  'carte ivoire / sbs',
  'carte ivoire',
  'sbs',
  'fbb',
]);

export function isRetiredMaterialLabel(material: string | undefined | null): boolean {
  const m = String(material ?? '').trim().toLowerCase();
  if (!m) return false;
  return RETIRED_MATERIAL_LABELS.has(m) || m.includes('carte ivoire');
}

export function filterRetiredMaterialOptions(options: string[]): string[] {
  return options.filter((o) => !isRetiredMaterialLabel(o));
}
