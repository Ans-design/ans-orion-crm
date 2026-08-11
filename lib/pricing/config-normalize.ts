/** Normalise face impression (Recto-verso / Recto-Verso / R/V). */
export function isRectoVerso(face: unknown): boolean {
  if (typeof face !== 'string' || !face.trim()) return false;
  const n = face.toLowerCase().replace(/\s+/g, ' ').trim();
  return (
    n === 'recto-verso' ||
    n === 'recto verso' ||
    n === 'r/v' ||
    n === 'rv' ||
    n.includes('recto-verso') ||
    n.includes('recto verso')
  );
}

/** Face POS : intérieur livres/bloc-notes prioritaire, sinon face classique. */
export function resolveConfigFace(config: Record<string, unknown>): unknown {
  return config.face_interieur ?? config.face_int ?? config.face ?? config.print_mode;
}

const NONE_FINITIONS = new Set(['aucune', 'sans finition', 'aucune finition', '']);

/** Extrait les finitions sélectionnées (array ou string unique). */
export function collectFinitionLabels(config: Record<string, unknown>): string[] {
  const raw = config.finitions ?? config.finition_surface ?? config.finition;
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' && raw.trim() ? [raw] : [];
  return list.filter((f) => {
    if (typeof f !== 'string') return false;
    return !NONE_FINITIONS.has(f.toLowerCase().trim());
  });
}

/** Applique majoration finition (+surchargePct % par option, défaut 12). */
export function applyFinitionSurcharge(
  prixUnit: number,
  config: Record<string, unknown>,
  articleId?: string,
  surchargePct = 12,
): number {
  if (articleId?.startsWith('fin-')) return prixUnit;
  const fins = collectFinitionLabels(config);
  if (fins.length === 0) return prixUnit;
  return Math.round(prixUnit * (1 + fins.length * (surchargePct / 100)));
}

/** Prix forcé : _prix_force, prix_unitaire (fin-autres), prix manuel. */
export function resolveForcedUnitPrice(config: Record<string, unknown>): number {
  const forced = Number(config._prix_force) || Number(config.prix_unitaire) || 0;
  return forced > 0 ? forced : 0;
}

/** Quantité POS depuis config (qty / quantite / quantity). */
export function resolveConfigQty(config: Record<string, unknown>, fallback = 1): number {
  const raw = config.qty ?? config.quantite ?? config.quantity ?? config.qte ?? fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}
