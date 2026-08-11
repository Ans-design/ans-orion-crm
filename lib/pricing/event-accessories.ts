/**
 * Accessoires / composants prix événementiel — seed Admin (modifiables Excel/DB).
 * Aucun prix figé dans le POS React : runtime via setEventAccessoryRuntime.
 * Préférer profils publiés Backoffice ; ce fichier = fallback seed / offline.
 */
export type EventAccessoryKind =
  | 'bracelet_type'
  | 'bracelet_technique'
  | 'lanyard'
  | 'envelope_blank'
  | 'envelope_closure'
  | 'fanion_accessory'
  | 'fanion_labor'
  | 'photobooth_cut'
  | 'photocall_structure'
  | 'comptoir_blank'
  | 'pochette_type'
  | 'event_param';

export type EventAccessoryLike = {
  kind: EventAccessoryKind;
  code: string;
  label: string;
  priceAr: number;
  unit?: string;
  widthMm?: number | null;
  heightMm?: number | null;
  material?: string | null;
  active?: boolean;
  visiblePOS?: boolean;
  details?: string | null;
};

/** Seeds métier — remplacés par DB dès sync Admin. */
export const DEFAULT_EVENT_ACCESSORIES: EventAccessoryLike[] = [
  // Bracelets
  { kind: 'bracelet_type', code: 'tyvek', label: 'Bracelet Tyvek', priceAr: 500, unit: 'pièce' },
  { kind: 'bracelet_type', code: 'silicone', label: 'Bracelet silicone', priceAr: 1500, unit: 'pièce' },
  { kind: 'bracelet_type', code: 'tissu', label: 'Bracelet tissu', priceAr: 2000, unit: 'pièce' },
  { kind: 'bracelet_type', code: 'vinyle', label: 'Bracelet vinyle', priceAr: 800, unit: 'pièce' },
  { kind: 'bracelet_type', code: 'papier', label: 'Bracelet papier', priceAr: 400, unit: 'pièce' },
  { kind: 'bracelet_technique', code: 'impression_standard', label: 'Impression standard', priceAr: 200, unit: 'pièce' },
  { kind: 'bracelet_technique', code: 'sublimation', label: 'Sublimation', priceAr: 500, unit: 'pièce' },
  { kind: 'bracelet_technique', code: 'serigraphie', label: 'Sérigraphie', priceAr: 400, unit: 'pièce' },
  { kind: 'bracelet_technique', code: 'tisse', label: 'Tissé', priceAr: 600, unit: 'pièce' },
  { kind: 'bracelet_technique', code: 'gravure', label: 'Gravure', priceAr: 700, unit: 'pièce' },
  // Lanyard — technique sans impact
  { kind: 'lanyard', code: 'plat_sublime_20', label: 'Cordon plat sublimé|20 mm', priceAr: 3500, unit: 'pièce' },
  { kind: 'lanyard', code: 'tubulaire_20', label: 'Cordon tubulaire|20 mm', priceAr: 3000, unit: 'pièce' },
  { kind: 'lanyard', code: 'satin_20', label: 'Cordon satin|20 mm', priceAr: 2800, unit: 'pièce' },
  // Enveloppes
  { kind: 'envelope_blank', code: 'c4_invitation', label: 'C4|Papier spécial invitation', priceAr: 2000, unit: 'pièce' },
  { kind: 'envelope_blank', code: 'c5_pcb', label: 'C5|PCB', priceAr: 800, unit: 'pièce' },
  { kind: 'envelope_blank', code: 'c6_pcb', label: 'C6|PCB', priceAr: 600, unit: 'pièce' },
  { kind: 'envelope_closure', code: 'cire', label: 'Fermeture cire', priceAr: 1000, unit: 'pièce' },
  { kind: 'envelope_closure', code: 'autocollante', label: 'Fermeture autocollante', priceAr: 0, unit: 'pièce' },
  // Fanion
  { kind: 'fanion_accessory', code: 'tige', label: 'Tige / pipette', priceAr: 100, unit: 'pièce' },
  { kind: 'fanion_labor', code: 'colle_finition', label: 'Main d’œuvre / colle / finition', priceAr: 300, unit: 'pièce' },
  // Photobooth
  { kind: 'photobooth_cut', code: 'simple', label: 'Découpe simple', priceAr: 0, unit: 'm²', details: '0 Ar' },
  { kind: 'photobooth_cut', code: 'personnalisee', label: 'Découpe personnalisée', priceAr: 50000, unit: 'm²' },
  // Photocall
  { kind: 'photocall_structure', code: 'alu_3000x2300', label: 'Cadre aluminium|3000x2300', priceAr: 800000, widthMm: 3000, heightMm: 2300, unit: 'pièce' },
  // Comptoir
  { kind: 'comptoir_blank', code: 'courbe_1000x500', label: 'Comptoir courbe|1000x500', priceAr: 200000, widthMm: 1000, heightMm: 500, unit: 'pièce' },
  // Pochette
  { kind: 'pochette_type', code: 'rabat_luxe', label: 'Rabat luxe dos carré', priceAr: 2000, unit: 'pièce' },
  { kind: 'pochette_type', code: 'plastique', label: 'Pochette plastique', priceAr: 5000, unit: 'pièce' },
  // Params (offset A4 impression enveloppe, etc.)
  { kind: 'event_param', code: 'envelope_offset_a4_print', label: 'Impression offset A4 (enveloppe)', priceAr: 400, unit: 'feuille' },
  { kind: 'event_param', code: 'pochette_format_multiplier', label: 'Multiplicateur format pochette', priceAr: 3, unit: '×' },
];

let cachedAccessories: EventAccessoryLike[] = DEFAULT_EVENT_ACCESSORIES;

export function setEventAccessoryRuntime(rows: EventAccessoryLike[] | null) {
  cachedAccessories = rows?.length ? rows : DEFAULT_EVENT_ACCESSORIES;
}

export function getEventAccessories(kind?: EventAccessoryKind): EventAccessoryLike[] {
  const all = cachedAccessories.filter((r) => r.active !== false);
  return kind ? all.filter((r) => r.kind === kind) : all;
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

export function findEventAccessory(
  kind: EventAccessoryKind,
  labelOrCode: string,
): EventAccessoryLike | null {
  const n = norm(labelOrCode);
  if (!n) return null;
  const list = getEventAccessories(kind);
  return (
    list.find((r) => norm(r.code) === n || norm(r.label) === n)
    ?? list.find((r) => norm(r.label).includes(n) || n.includes(norm(r.label.split('|')[0] ?? '')))
    ?? null
  );
}

export function resolveAccessoryPrice(kind: EventAccessoryKind, labelOrCode: string, fallback = 0): number {
  return findEventAccessory(kind, labelOrCode)?.priceAr ?? fallback;
}
