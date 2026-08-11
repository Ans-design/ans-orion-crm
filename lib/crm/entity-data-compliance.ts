/**
 * Inventaire conformité Import / Export / Corbeille (plan CRUD) — mis à jour ORION 10/10.
 */
export const ENTITY_DATA_COMPLIANCE = [
  { id: 'clients', import: true, export: true, trash: true, notes: 'API clients + entity-data' },
  { id: 'devis', import: false, export: true, trash: true, notes: 'Import masqué — round-trip lignes non complet' },
  { id: 'reclamations', import: true, export: true, trash: true },
  { id: 'suppliers', import: true, export: true, trash: true, notes: 'Excel Admin unique + toggle corbeille' },
  { id: 'stock-items', import: true, export: true, trash: true, notes: 'API ?archived=1' },
  { id: 'purchase-orders', import: false, export: true, trash: true, notes: 'Import masqué' },
  { id: 'machines', import: true, export: true, trash: true },
  { id: 'equipments', import: true, export: true, trash: true, notes: 'API /materiels?archived=1' },
  { id: 'livraisons', import: false, export: true, trash: true, notes: 'Import masqué' },
  { id: 'commandes', import: false, export: true, trash: true, notes: 'ledger' },
  { id: 'factures', import: false, export: true, trash: true, notes: 'printFormat + export liste ≠ comptable' },
  { id: 'paiements', import: false, export: true, trash: true },
  { id: 'employees', import: true, export: true, trash: true, notes: 'API /rh/employes?archived=1' },
] as const;
