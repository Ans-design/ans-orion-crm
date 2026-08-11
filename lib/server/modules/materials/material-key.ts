/** Clé stable matière + grammage pour BaseMaterial.materialKey */
export function buildMaterialKey(baseKey: string, grammage?: string | null): string {
  const key = baseKey.trim().toLowerCase();
  if (!grammage?.trim()) return key;
  const g = grammage.trim().toLowerCase().replace(/\s+/g, '');
  return `${key}:${g}`;
}

export function parseMaterialKey(materialKey: string): { baseKey: string; grammage: string | null } {
  const idx = materialKey.indexOf(':');
  if (idx <= 0) return { baseKey: materialKey, grammage: null };
  return {
    baseKey: materialKey.slice(0, idx),
    grammage: materialKey.slice(idx + 1) || null,
  };
}

export function normalizeMaterialName(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
