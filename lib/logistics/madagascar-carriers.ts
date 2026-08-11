/**
 * Référentiel transporteurs / coopératives Madagascar — inspiration logistique locale.
 * Source de vérité UI livraison (pas de hardcode dispersé dans les pages).
 */

export type MadagascarCarrier = {
  id: string;
  label: string;
  type: 'cooperative' | 'coursier' | 'transporteur' | 'interne';
  zones: string[];
  contactHint?: string;
};

export const MADAGASCAR_CARRIERS: MadagascarCarrier[] = [
  {
    id: 'ans-interne',
    label: 'ANS DESIGN — livraison interne',
    type: 'interne',
    zones: ['Antananarivo', 'Alasora', 'Itaosy', 'Ambohimanarina'],
  },
  {
    id: 'taxi-coursier',
    label: 'Taxi / coursier Antananarivo',
    type: 'coursier',
    zones: ['Antananarivo'],
    contactHint: 'Numéro chauffeur habituel',
  },
  {
    id: 'cotisse',
    label: 'Coopérative COTISSE (colis)',
    type: 'cooperative',
    zones: ['Antananarivo', 'Toamasina', 'Mahajanga', 'Fianarantsoa', 'Toliara'],
    contactHint: 'Bureau COTISSE — numéro suivi colis',
  },
  {
    id: 'paositra',
    label: 'Paositra Malagasy',
    type: 'transporteur',
    zones: ['National'],
    contactHint: 'Numéro recommandé / suivi postal',
  },
  {
    id: 'transbus',
    label: 'Transport bus / ligne régionale',
    type: 'transporteur',
    zones: ['Provinces'],
    contactHint: 'Agence bus + contact destinataire',
  },
  {
    id: 'client-recup',
    label: 'Retrait client (showroom)',
    type: 'interne',
    zones: ['Antananarivo'],
  },
];

export function carrierLabelById(id: string | null | undefined): string {
  if (!id) return '';
  return MADAGASCAR_CARRIERS.find((c) => c.id === id)?.label ?? id;
}

export function carriersForZone(ville: string | null | undefined): MadagascarCarrier[] {
  if (!ville?.trim()) return MADAGASCAR_CARRIERS;
  const v = ville.toLowerCase();
  return MADAGASCAR_CARRIERS.filter(
    (c) => c.zones.some((z) => z.toLowerCase() === 'national' || v.includes(z.toLowerCase()) || z.toLowerCase().includes(v)),
  );
}
