/** Grilles papier ISF — source PRIX_2026.xlsx (D.papiers dans base ok.html). */

export type PaperPriceTier = { max: number; px: number };

export type PaperPriceEntry = {
  label: string;
  min?: number;
  note?: string;
  tiers: PaperPriceTier[];
};

/** Paliers dégressifs impression sans finition (D.remises / impression_sf:general). */
export const IMPRESSION_SF_VOLUME_REMISES = [
  { min: 1, max: 9, rate: 0 },
  { min: 10, max: 39, rate: 0.1 },
  { min: 40, max: 79, rate: 0.18 },
  { min: 80, max: 129, rate: 0.25 },
  { min: 130, max: Infinity, rate: 0.33 },
] as const;

export const IMPRESSION_SF_PAPER_TARIFFS: Record<string, PaperPriceEntry> = {
  nb80: {
    label: 'Offset 80g N&B',
    tiers: [
      { max: 49, px: 200 },
      { max: 999, px: 180 },
      { max: 4999, px: 150 },
      { max: 9999, px: 120 },
      { max: 19999, px: 100 },
      { max: 99999, px: 80 },
      { max: Infinity, px: 70 },
    ],
  },
  q80la: {
    label: 'Offset 80g Quadri Laser',
    tiers: [
      { max: 49, px: 600 },
      { max: 999, px: 450 },
      { max: 4999, px: 400 },
      { max: 9999, px: 350 },
      { max: 19999, px: 300 },
      { max: 99999, px: 250 },
      { max: Infinity, px: 200 },
    ],
  },
  pcb90: {
    label: 'PCB / PCM / Glossy 90–135g',
    tiers: [
      { max: 49, px: 800 },
      { max: 999, px: 720 },
      { max: 4999, px: 600 },
      { max: 9999, px: 480 },
      { max: 19999, px: 400 },
      { max: 99999, px: 320 },
      { max: Infinity, px: 270 },
    ],
  },
  pcb135: {
    label: 'PCB / PCM / Glossy 135–170g',
    tiers: [
      { max: 49, px: 850 },
      { max: 999, px: 765 },
      { max: 4999, px: 638 },
      { max: 9999, px: 510 },
      { max: 19999, px: 425 },
      { max: 99999, px: 340 },
      { max: Infinity, px: 284 },
    ],
  },
  pcb170: {
    label: 'PCB / PCM / Glossy / Texturé 170–299g',
    tiers: [
      { max: 49, px: 1000 },
      { max: 999, px: 900 },
      { max: 4999, px: 750 },
      { max: 9999, px: 600 },
      { max: 19999, px: 500 },
      { max: 99999, px: 400 },
      { max: Infinity, px: 333 },
    ],
  },
  pcb350: {
    label: 'PCB / PCM / Glossy 300–350g',
    tiers: [
      { max: 49, px: 1500 },
      { max: 999, px: 1350 },
      { max: 4999, px: 1125 },
      { max: 9999, px: 900 },
      { max: 19999, px: 750 },
      { max: 99999, px: 600 },
      { max: Infinity, px: 500 },
    ],
  },
  /** Couverture / feuille A4 : PCB 300–350g + pelliculage A4 (600 Ar) — ≠ PCB nu, ≠ tarif CV pièce. */
  pellicule320: {
    label: 'Papier pelliculé 320g (PCB + pelliculage A4)',
    tiers: [
      { max: 49, px: 2100 },
      { max: 999, px: 1950 },
      { max: 4999, px: 1725 },
      { max: 9999, px: 1500 },
      { max: 19999, px: 1350 },
      { max: 99999, px: 1200 },
      { max: Infinity, px: 1100 },
    ],
  },
  /** 370g : même base + petit premium grammage. */
  pellicule370: {
    label: 'Papier pelliculé 370g (PCB + pelliculage A4)',
    tiers: [
      { max: 49, px: 2250 },
      { max: 999, px: 2100 },
      { max: 4999, px: 1875 },
      { max: 9999, px: 1650 },
      { max: 19999, px: 1500 },
      { max: 99999, px: 1350 },
      { max: Infinity, px: 1250 },
    ],
  },
  pcb600: {
    label: 'PCB 600g contre-collé',
    tiers: [
      { max: 49, px: 2500 },
      { max: 999, px: 2250 },
      { max: 4999, px: 1875 },
      { max: 9999, px: 1500 },
      { max: 19999, px: 1250 },
      { max: Infinity, px: 1000 },
    ],
  },
  pcb700: {
    label: 'PCB 700g contre-collé',
    tiers: [
      { max: 49, px: 3500 },
      { max: 999, px: 3150 },
      { max: 4999, px: 2625 },
      { max: 9999, px: 2100 },
      { max: 19999, px: 1750 },
      { max: Infinity, px: 1400 },
    ],
  },
  pcb900: {
    label: 'PCB / Cover luxe 900g',
    tiers: [
      { max: 49, px: 5000 },
      { max: 999, px: 4500 },
      { max: 4999, px: 3750 },
      { max: 9999, px: 3000 },
      { max: 19999, px: 2500 },
      { max: Infinity, px: 2000 },
    ],
  },
  toile: {
    label: 'Papier Toile fin 270g',
    tiers: [
      { max: 49, px: 2500 },
      { max: 999, px: 2250 },
      { max: 4999, px: 1875 },
      { max: 9999, px: 1500 },
      { max: 19999, px: 1250 },
      { max: 99999, px: 1000 },
      { max: Infinity, px: 833 },
    ],
  },
  invitation: {
    label: 'Papier Invitation luxe 180–300g',
    tiers: [
      { max: 49, px: 2000 },
      { max: 999, px: 1800 },
      { max: 4999, px: 1500 },
      { max: Infinity, px: 1200 },
    ],
  },
  autocollant: {
    label: 'Papier Autocollant / Vinyle',
    tiers: [
      { max: 49, px: 1000 },
      { max: 999, px: 900 },
      { max: 4999, px: 750 },
      { max: 9999, px: 600 },
      { max: 19999, px: 500 },
      { max: 99999, px: 400 },
      { max: Infinity, px: 333 },
    ],
  },
  pvc_transl: {
    label: 'PVC Translucide',
    tiers: [
      { max: 49, px: 4500 },
      { max: 199, px: 4050 },
      { max: 499, px: 3825 },
      { max: 999, px: 3600 },
      { max: 1499, px: 3375 },
      { max: 2000, px: 3150 },
    ],
  },
  pvc_opaque: {
    label: 'PVC Opaque 0,86mm',
    tiers: [
      { max: 49, px: 12000 },
      { max: 199, px: 10800 },
      { max: 499, px: 10200 },
      { max: 999, px: 9600 },
      { max: 1499, px: 9000 },
      { max: 2000, px: 8400 },
    ],
  },
  sublimation: {
    label: 'Sublimation',
    tiers: [
      { max: 49, px: 1500 },
      { max: 199, px: 1350 },
      { max: 499, px: 1275 },
      { max: 999, px: 1200 },
      { max: 1499, px: 1125 },
      { max: 2000, px: 1050 },
    ],
  },
};
