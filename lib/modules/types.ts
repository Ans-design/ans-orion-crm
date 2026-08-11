import type { LucideIcon } from 'lucide-react';

export type ModuleGroup =
  | 'cockpit_direction'
  | 'ventes_pos'
  | 'crm_clients'
  | 'devis_facturation'
  | 'gpao_production'
  | 'studio_graphique'
  | 'maintenance_technique'
  | 'logistique_livraison'
  | 'stock_achats'
  | 'finance_caisse'
  | 'rh_employes'
  | 'communication_marketing'
  | 'administration_parametres'
  | 'rapports_analyse';

export type ModuleStatus = 'active' | 'hidden' | 'soon' | 'experimental';

export type OrionModule = {
  id: string;
  label: string;
  group: ModuleGroup;
  href: string;
  icon: LucideIcon;
  description?: string;
  status: ModuleStatus;
  order: number;
};

export type NavSectionItem =
  | { type: 'link'; moduleId: string }
  | { type: 'divider' }
  | { type: 'label'; text: string };

export type RoleProfile = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  homeRoute: string;
  /** Rôles auth existants mappés sur ce profil */
  authRoles: string[];
  nav: NavSectionItem[];
};

export type PermissionFlags = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canValidate: boolean;
  canAssign: boolean;
  canExport: boolean;
  canOverridePrice: boolean;
  canCloseTask: boolean;
  canSeeFinance: boolean;
  canSeeAllBranches: boolean;
  canConfigure: boolean;
  canAccessAdmin: boolean;
};
