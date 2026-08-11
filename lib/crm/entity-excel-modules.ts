/**
 * Registre Excel listes métier (CRM / ops / ledger / RH) — même stack Admin.
 */
import type { AdminExcelImportMode, AdminExcelModule } from '@/lib/admin/excel-import-export';

export type EntityExcelId =
  | 'clients'
  | 'devis'
  | 'reclamations'
  | 'suppliers'
  | 'stock-items'
  | 'purchase-orders'
  | 'machines'
  | 'equipments'
  | 'livraisons'
  | 'commandes'
  | 'factures'
  | 'paiements'
  | 'employees';

export type EntityExcelModule = AdminExcelModule & {
  id: EntityExcelId;
  /** soft-archive model name for assertSoftDeleteAllowed */
  prismaEntity: string;
  allowImport: boolean;
  permissionRead: import('@/lib/auth/permissions').Permission;
  permissionWrite: import('@/lib/auth/permissions').Permission;
};

export const ENTITY_EXCEL_MODULES: EntityExcelModule[] = [
  {
    id: 'clients',
    label: 'Clients',
    fileStem: 'clients',
    mode: 'upsert',
    prismaEntity: 'Client',
    allowImport: true,
    permissionRead: 'clients:read',
    permissionWrite: 'clients:write',
    importEndpoint: '/api/entity-data/clients/import',
    prepareExportEndpoint: '/api/entity-data/clients/export',
  },
  {
    id: 'devis',
    label: 'Devis',
    fileStem: 'devis',
    mode: 'export-only',
    prismaEntity: 'Devis',
    allowImport: false,
    permissionRead: 'devis:read',
    permissionWrite: 'devis:write',
    prepareExportEndpoint: '/api/entity-data/devis/export',
  },
  {
    id: 'reclamations',
    label: 'Réclamations',
    fileStem: 'reclamations',
    mode: 'upsert',
    prismaEntity: 'ClientReclamation',
    allowImport: true,
    permissionRead: 'clients:read',
    permissionWrite: 'clients:write',
    importEndpoint: '/api/entity-data/reclamations/import',
    prepareExportEndpoint: '/api/entity-data/reclamations/export',
  },
  {
    id: 'suppliers',
    label: 'Fournisseurs',
    fileStem: 'fournisseurs',
    mode: 'upsert',
    prismaEntity: 'Supplier',
    allowImport: true,
    permissionRead: 'fournisseurs:read',
    permissionWrite: 'fournisseurs:write',
    importEndpoint: '/api/entity-data/suppliers/import',
    prepareExportEndpoint: '/api/entity-data/suppliers/export',
  },
  {
    id: 'stock-items',
    label: 'Stock atelier',
    fileStem: 'stock-atelier',
    mode: 'upsert',
    prismaEntity: 'StockItem',
    allowImport: true,
    permissionRead: 'stock:read',
    permissionWrite: 'stock:write',
    importEndpoint: '/api/entity-data/stock-items/import',
    prepareExportEndpoint: '/api/entity-data/stock-items/export',
  },
  {
    id: 'purchase-orders',
    label: 'Achats',
    fileStem: 'achats',
    mode: 'export-only',
    prismaEntity: 'PurchaseOrder',
    allowImport: false,
    permissionRead: 'achats:read',
    permissionWrite: 'achats:write',
    prepareExportEndpoint: '/api/entity-data/purchase-orders/export',
  },
  {
    id: 'machines',
    label: 'Machines',
    fileStem: 'machines',
    mode: 'upsert',
    prismaEntity: 'Machine',
    allowImport: true,
    permissionRead: 'production:read',
    permissionWrite: 'production:write',
    importEndpoint: '/api/entity-data/machines/import',
    prepareExportEndpoint: '/api/entity-data/machines/export',
  },
  {
    id: 'equipments',
    label: 'Matériels',
    fileStem: 'materiels',
    mode: 'upsert',
    prismaEntity: 'Equipment',
    allowImport: true,
    permissionRead: 'production:read',
    permissionWrite: 'production:write',
    importEndpoint: '/api/entity-data/equipments/import',
    prepareExportEndpoint: '/api/entity-data/equipments/export',
  },
  {
    id: 'livraisons',
    label: 'Livraisons',
    fileStem: 'livraisons',
    mode: 'export-only',
    prismaEntity: 'Livraison',
    allowImport: false,
    permissionRead: 'livraisons:read',
    permissionWrite: 'livraisons:write',
    prepareExportEndpoint: '/api/entity-data/livraisons/export',
  },
  {
    id: 'commandes',
    label: 'Commandes',
    fileStem: 'commandes',
    mode: 'export-only' as AdminExcelImportMode,
    prismaEntity: 'Commande',
    allowImport: false,
    permissionRead: 'commandes:read',
    permissionWrite: 'commandes:write',
    prepareExportEndpoint: '/api/entity-data/commandes/export',
  },
  {
    id: 'factures',
    label: 'Factures',
    fileStem: 'factures',
    mode: 'export-only',
    prismaEntity: 'Facture',
    allowImport: false,
    permissionRead: 'factures:read',
    permissionWrite: 'factures:write',
    prepareExportEndpoint: '/api/entity-data/factures/export',
  },
  {
    id: 'paiements',
    label: 'Paiements',
    fileStem: 'paiements',
    mode: 'export-only',
    prismaEntity: 'Paiement',
    allowImport: false,
    permissionRead: 'paiements:read',
    permissionWrite: 'paiements:write',
    prepareExportEndpoint: '/api/entity-data/paiements/export',
  },
  {
    id: 'employees',
    label: 'Employés',
    fileStem: 'employes',
    mode: 'upsert',
    prismaEntity: 'Employee',
    allowImport: true,
    permissionRead: 'rh:read',
    permissionWrite: 'rh:write',
    importEndpoint: '/api/entity-data/employees/import',
    prepareExportEndpoint: '/api/entity-data/employees/export',
  },
];

export function getEntityExcelModule(id: string): EntityExcelModule | undefined {
  return ENTITY_EXCEL_MODULES.find((m) => m.id === id);
}
