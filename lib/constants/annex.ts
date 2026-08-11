export const DEFAULT_ANNEXES = [
  { code: 'AX0', name: 'Siège — Andravoahangy', ville: 'Antananarivo', isDefault: true },
  { code: 'AX1', name: 'Annexe — Ivato', ville: 'Antananarivo', isDefault: false },
] as const;

export const ANNEXE_STATUTS = ['Actif', 'Inactif', 'Maintenance'] as const;

export const SITE_FILTER_ALL = 'ALL';
