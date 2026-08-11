// Paramètres globaux Admin Prix — source PRIX_2024 / captures Admin Prix

export interface GlobalPricingConfig {
  production: {
    standard: number;
    express48h: number;
    superExpress24h: number;
  };
  bat: {
    digitalEmail: number;
    sansBat: number;
    physiquePapier: number;
  };
  livraison: {
    retraitAtelier: number;
    emballageRenforce: number;
    livraisonTana: number;
    livraisonProvince: number;
  };
  tvaDefault: number;
}

export const DEFAULT_GLOBAL_PRICING: GlobalPricingConfig = {
  production: { standard: 1, express48h: 1.3, superExpress24h: 1.6 },
  bat: { digitalEmail: 0, sansBat: 0, physiquePapier: 15000 },
  livraison: { retraitAtelier: 0, emballageRenforce: 5000, livraisonTana: 12000, livraisonProvince: 35000 },
  tvaDefault: 20,
};

export const PRODUCTION_DELAYS = [
  { key: 'standard', label: 'Standard (délai atelier)', multiplierKey: 'standard' as const },
  { key: 'express48', label: 'Express 48 h', multiplierKey: 'express48h' as const },
  { key: 'super24', label: 'Super express 24 h', multiplierKey: 'superExpress24h' as const },
];

export const BAT_OPTIONS = [
  { key: 'digital', label: 'BAT numérique (e-mail)', priceKey: 'digitalEmail' as const },
  { key: 'sans', label: 'Sans BAT', priceKey: 'sansBat' as const },
  { key: 'physique', label: 'BAT physique (épreuve papier)', priceKey: 'physiquePapier' as const },
];

export const LIVRAISON_OPTIONS = [
  { key: 'retrait', label: 'Retrait à l\'atelier', priceKey: 'retraitAtelier' as const },
  { key: 'emballage', label: 'Emballage renforcé', priceKey: 'emballageRenforce' as const },
  { key: 'tana', label: 'Livraison Antananarivo', priceKey: 'livraisonTana' as const },
  { key: 'province', label: 'Livraison province / express', priceKey: 'livraisonProvince' as const },
];

export const PAYMENT_CHANNELS = [
  { key: 'Especes', label: 'Espèces', icon: '💵' },
  { key: 'Mvola', label: 'Mvola', icon: '📱' },
  { key: 'Orange Money', label: 'Orange Money', icon: '🟠' },
  { key: 'Airtel Money', label: 'Airtel Money', icon: '🔴' },
  { key: 'Virement', label: 'Virement bancaire', icon: '🏦' },
  { key: 'Cheque', label: 'Chèque', icon: '📝' },
];

/** @deprecated Utiliser COMMANDE_PRODUCTION_STEPS depuis lib/data/commande-status */
export const COMMANDE_WORKFLOW = [
  'En validation',
  'BAT envoyé',
  'BAT approuvé',
  'En impression',
  'Façonnage',
  'Prêt à livrer',
  'Livrée',
] as const;
