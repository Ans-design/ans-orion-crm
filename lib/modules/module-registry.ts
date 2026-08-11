import { getModuleIcon } from '@/lib/icons/app-icons';
import {
  LayoutDashboard, FileText, ClipboardList, Users, Printer, ShoppingCart, Palette,
  Factory, Calendar, Package, Building2, ShoppingBag, Cpu, FileCheck, Truck,
  Receipt, Banknote, Wallet, BarChart3, Sliders, Tag, History, Settings2, Settings,
  Wrench, Briefcase, Megaphone, Layers, MessageSquare, Lightbulb, ListTodo,
  UsersRound, CalendarClock, Newspaper, CircleDollarSign, PieChart, Store, FolderKanban,
  FileImage, FolderTree, Send, Shield,   Activity, Scissors, Smartphone, Trash2,
  Bell, Radio, Monitor, UserCircle, BadgeDollarSign, Trophy, LayoutGrid, UserSearch,
  Laptop, Ticket, ClipboardCheck, ScanEye, Headphones, AlertOctagon, HelpCircle, Download,
  Gauge,
} from 'lucide-react';
import type { OrionModule } from './types';

/** Registre central des modules ANS Orion — routes existantes, pas de duplication */
const MODULE_REGISTRY_BASE: Record<string, OrionModule> = {
  cockpit: {
    id: 'cockpit', label: 'Cockpit global', group: 'cockpit_direction',
    href: '/dashboard', icon: LayoutDashboard, status: 'active', order: 1,
    description: 'Tableau de bord maître direction — synthèse 360°',
  },
  operations: {
    id: 'operations', label: 'Opérations temps réel', group: 'cockpit_direction',
    href: '/operations', icon: Activity, status: 'active', order: 2,
    description: 'Urgences & exécution immédiate — pas un cockpit bis',
  },
  admin_backoffice: {
    id: 'admin_backoffice', label: 'Backoffice', group: 'administration_parametres',
    href: '/administration/backoffice', icon: Settings2, status: 'hidden', order: 1,
    description: 'Configuration métier — santé, catalogue, prix, variables, stock',
  },
  admin_catalogue: {
    id: 'admin_catalogue', label: 'Catalogue & POS', group: 'administration_parametres',
    href: '/administration/catalogue-pos', icon: Sliders, status: 'hidden', order: 2,
    description: 'Studio unifié articles, chips, variables, mockups et POS',
  },
  admin_prix_nav: {
    id: 'admin_prix_nav', label: 'Articles finis', group: 'administration_parametres',
    href: '/administration/prix', icon: Tag, status: 'hidden', order: 3,
    description: 'Tarification dynamique et migration',
  },
  admin_variables_nav: {
    id: 'admin_variables_nav', label: 'Variables tarification', group: 'administration_parametres',
    href: '/administration/variables', icon: Layers, status: 'active', order: 4,
    description: 'Variables globales PricingVariable (TVA, production, coeffs)',
  },
  admin_matieres_nav: {
    id: 'admin_matieres_nav', label: 'Matières & grammages', group: 'administration_parametres',
    href: '/administration/matieres', icon: Package, status: 'hidden', order: 5,
    description: 'Matières DB fusion Excel',
  },
  admin_modeles_articles: {
    id: 'admin_modeles_articles', label: "Modèles d'articles", group: 'administration_parametres',
    href: '/administration/modeles-articles', icon: FolderTree, status: 'hidden', order: 6,
    description: 'Petit format, grand format, textile, goodies, service',
  },
  admin_flux_statuts: {
    id: 'admin_flux_statuts', label: 'Flux & statuts', group: 'administration_parametres',
    href: '/administration/production-flux', icon: Activity, status: 'hidden', order: 7,
    description: 'Transitions métier et statuts configurables',
  },
  admin_estimation_temps: {
    id: 'admin_estimation_temps', label: 'Temps & capacités', group: 'administration_parametres',
    href: '/administration/estimation-temps', icon: Gauge, status: 'active', order: 71,
    description: 'Vitesses et durées par opération : conception, impression, finitions, CQ',
  },
  admin_synchronisation: {
    id: 'admin_synchronisation', label: 'Synchronisation', group: 'administration_parametres',
    href: '/administration/synchronisation', icon: Radio, status: 'hidden', order: 8,
    description: 'Centre sync Articles↔POS, Prix↔Devis, Stock↔Production',
  },
  admin_import_export: {
    id: 'admin_import_export', label: 'Import / Export', group: 'administration_parametres',
    href: '/administration/import-export', icon: Download, status: 'hidden', order: 9,
    description: 'Import catalogue avec prévisualisation obligatoire',
  },
  admin_home: {
    id: 'admin_home', label: 'Hub administration', group: 'administration_parametres',
    href: '/admin', icon: LayoutGrid, status: 'hidden', order: 0,
    description: 'Alias — voir Backoffice',
  },
  admin_hub: {
    id: 'admin_hub', label: 'Catalogue articles', group: 'administration_parametres',
    href: '/administration/catalogue-prix-stock', icon: Sliders, status: 'hidden', order: 4,
    description: 'Studio Prix — articles et tarification',
  },
  admin_overview: {
    id: 'admin_overview', label: "Vue d'ensemble", group: 'administration_parametres',
    href: '/admin/vue', icon: LayoutGrid, status: 'hidden', order: 2,
    description: 'Effectifs, urgences, présences live — adm_vue HTML v29',
  },
  admin_annexes: {
    id: 'admin_annexes', label: 'Annexes & sites', group: 'administration_parametres',
    href: '/admin/annexes', icon: Building2, status: 'hidden', order: 3,
    description: 'Multi-sites AX0/AX1 — filtres & affectations',
  },
  admin_permissions: {
    id: 'admin_permissions', label: 'Permissions modules', group: 'administration_parametres',
    href: '/admin/permissions', icon: Shield, status: 'hidden', order: 4,
    description: 'Matrice super-admin — modules par rôle et par login',
  },
  devis: {
    id: 'devis', label: 'Devis', group: 'devis_facturation',
    href: '/devis', icon: FileText, status: 'active', order: 10,
  },
  commandes: {
    id: 'commandes',
    label: 'Commandes',
    group: 'gpao_production',
    href: '/commandes',
    icon: ClipboardList,
    status: 'active',
    order: 11,
    description: 'Sidebar univers Commercial (override) — exécution GPAO / production en aval',
  },
  clients: {
    id: 'clients', label: 'CRM Clients', group: 'crm_clients',
    href: '/clients', icon: Users, status: 'active', order: 12,
  },
  reclamations: {
    id: 'reclamations', label: 'Réclamations clients', group: 'crm_clients',
    href: '/reclamations', icon: AlertOctagon, status: 'active', order: 13,
    description: 'SAV, litiges, qualité — liées aux clients',
  },
  pos: {
    id: 'pos', label: 'Catalogue vente', group: 'ventes_pos',
    href: '/pos', icon: Printer, status: 'active', order: 20,
  },
  panier: {
    id: 'panier', label: 'Panier', group: 'ventes_pos',
    href: '/panier', icon: ShoppingCart, status: 'active', order: 21,
    description: 'Construction d’offre — les documents Devis restent dans Devis',
  },
  conception: {
    id: 'conception', label: 'Conception graphique', group: 'studio_graphique',
    href: '/pos/conception', icon: Palette, status: 'active', order: 22,
  },
  ws_commercial: {
    id: 'ws_commercial', label: 'Mon espace vente', group: 'ventes_pos',
    href: '/workspace/commercial', icon: Briefcase, status: 'active', order: 23,
    description: 'Vue filtrée Commercial — ouvrir Devis / Commandes / Clients pour le module complet',
  },
  ws_studio: {
    id: 'ws_studio', label: 'Mon studio', group: 'studio_graphique',
    href: '/workspace/studio', icon: Palette, status: 'active', order: 30,
    description: 'Vue filtrée Studio — pas une base distincte',
  },
  ws_production: {
    id: 'ws_production', label: 'Mon poste production', group: 'gpao_production',
    href: '/workspace/production', icon: Factory, status: 'active', order: 31,
    description: 'Vue filtrée Production / GPAO',
  },
  ws_logistique: {
    id: 'ws_logistique', label: 'Mes livraisons', group: 'logistique_livraison',
    href: '/workspace/logistique', icon: Truck, status: 'active', order: 32,
    description: 'Vue filtrée Livraisons',
  },
  ws_faconnage: {
    id: 'ws_faconnage', label: 'Mon poste façonnage', group: 'gpao_production',
    href: '/workspace/faconnage', icon: Scissors, status: 'active', order: 33,
    description: 'Façonnage — tâches, déchets, commandes atelier',
  },
  ws_cm: {
    id: 'ws_cm', label: 'Mon espace CM', group: 'communication_marketing',
    href: '/workspace/cm', icon: Smartphone, status: 'active', order: 34,
    description: 'Community Manager — commandes, réseaux sociaux, clients',
  },
  ws_maintenance: {
    id: 'ws_maintenance', label: 'Mon espace maintenance', group: 'maintenance_technique',
    href: '/workspace/maintenance', icon: Wrench, status: 'active', order: 35,
    description: 'Technicien — signalements, interventions, checklist',
  },
  ws_finance: {
    id: 'ws_finance', label: 'Mon espace finance', group: 'finance_caisse',
    href: '/workspace/finance', icon: Wallet, status: 'active', order: 33,
    description: 'Vue filtrée Finance — Factures / Paiements / Caisse restent les modules complets',
  },
  plan_matiere: {
    id: 'plan_matiere', label: 'Plan matière', group: 'gpao_production',
    href: '/production/dechets', icon: Trash2, status: 'active', order: 45,
    description: 'Besoins matières commande, réservations stock, déchets et pertes atelier',
  },
  rh_performance: {
    id: 'rh_performance', label: 'Performance équipe', group: 'rh_employes',
    href: '/rh/performance', icon: Trophy, status: 'active', order: 111,
    description: 'Évaluations, leaderboard, scores ponctualité/qualité',
  },
  rh_mon_profil: {
    id: 'rh_mon_profil', label: 'Mon profil', group: 'rh_employes',
    href: '/rh/mon-profil', icon: UserCircle, status: 'active', order: 110,
    description: 'Fiche employé, scores, coffre numérique',
  },
  rh_equipements: {
    id: 'rh_equipements', label: 'Mes équipements', group: 'maintenance_technique',
    href: '/machines', icon: Monitor, status: 'hidden', order: 56,
    description: 'Alias → Machines (évite doublon liste atelier)',
  },
  rh_paie: {
    id: 'rh_paie', label: 'Paie & salaires', group: 'rh_employes',
    href: '/rh/paie', icon: BadgeDollarSign, status: 'active', order: 116,
    description: 'Grille salariale MGA, variables, bulletins — adm_pay',
  },
  rh_recruitment: {
    id: 'rh_recruitment', label: 'Recrutement ATS', group: 'rh_employes',
    href: '/rh/recrutement', icon: UserSearch, status: 'active', order: 115,
    description: 'Pipeline candidats — adm_rh HTML v29',
  },
  cm_notifications: {
    id: 'cm_notifications', label: 'Notifications clients', group: 'communication_marketing',
    href: '/cm/notifications', icon: Bell, status: 'active', order: 107,
    description: 'Alertes retard, BAT, livraisons — relances clients',
  },
  admin_ticker: {
    id: 'admin_ticker', label: 'Bandeau alertes', group: 'administration_parametres',
    href: '/admin/ticker', icon: Radio, status: 'hidden', order: 5,
    description: 'Messages bandeau info équipe — dir_ticker HTML',
  },
  production: {
    id: 'production', label: 'Production Kanban', group: 'gpao_production',
    href: '/production', icon: Factory, status: 'active', order: 40,
  },
  planning: {
    id: 'planning', label: 'Planning Gantt', group: 'gpao_production',
    href: '/planning', icon: Calendar, status: 'active', order: 41,
    description: 'Timeline machines 7h–18h — adm_tasks HTML v29',
  },
  studio_hub: {
    id: 'studio_hub', label: 'Studio graphique', group: 'studio_graphique',
    href: '/studio', icon: Palette, status: 'active', order: 42,
    description: 'Hub unique — briefs, fichiers, prépresse (onglets)',
  },
  studio_briefs: {
    id: 'studio_briefs', label: 'Briefs clients', group: 'studio_graphique',
    href: '/studio?tab=briefs', icon: FolderKanban, status: 'hidden', order: 43,
    description: 'Alias deep-link → /studio?tab=briefs',
  },
  studio_fichiers: {
    id: 'studio_fichiers', label: 'Fichiers sources', group: 'studio_graphique',
    href: '/studio?tab=fichiers', icon: FileImage, status: 'hidden', order: 44,
    description: 'Alias deep-link → /studio?tab=fichiers',
  },
  prepresse: {
    id: 'prepresse', label: 'Prépresse', group: 'studio_graphique',
    href: '/studio?tab=prepresse', icon: ScanEye, status: 'hidden', order: 45,
    description: 'Alias deep-link → /studio?tab=prepresse',
  },
  bat: {
    id: 'bat', label: 'Bon à tirer', group: 'studio_graphique',
    href: '/bat', icon: FileCheck, status: 'active', order: 46,
  },
  machines: {
    id: 'machines',
    label: 'Machines de production',
    group: 'maintenance_technique',
    href: '/machines',
    icon: Cpu,
    status: 'active',
    order: 50,
    description: 'Parc machines atelier (impression / finition / découpe) — distinct du parc matériels RH/IT',
  },
  materiels: {
    id: 'materiels', label: 'Matériels RH & IT', group: 'maintenance_technique',
    href: '/materiels', icon: Laptop, status: 'active', order: 51,
    description: 'Parc IT / véhicules / licences RH — distinct des machines de production atelier',
  },
  maintenance_tickets: {
    id: 'maintenance_tickets', label: 'Tickets maintenance', group: 'maintenance_technique',
    href: '/maintenance/tickets', icon: Ticket, status: 'active', order: 52,
    description: 'Pannes, interventions, diagnostics — impact planning',
  },
  qualite: {
    id: 'qualite', label: 'Contrôle qualité', group: 'gpao_production',
    href: '/production/qualite', icon: ClipboardCheck, status: 'active', order: 46,
    description: 'Contrôle finition, conformité BAT, incidents qualité',
  },
  ws_accueil: {
    id: 'ws_accueil', label: 'Mon accueil', group: 'rh_employes',
    href: '/workspace/accueil', icon: Headphones, status: 'active', order: 36,
    description: 'Agent d\'accueil — visiteurs, appels, rendez-vous',
  },
  ws_conducteur: {
    id: 'ws_conducteur', label: 'Mon poste conducteur', group: 'gpao_production',
    href: '/workspace/conducteur', icon: Cpu, status: 'active', order: 37,
    description: 'Conducteur machine — impression, rendement, consommables',
  },
  ws_magasin: {
    id: 'ws_magasin', label: 'Mon magasin', group: 'stock_achats',
    href: '/workspace/magasin', icon: Package, status: 'active', order: 54,
    description: 'Responsable stock — inventaire, réservations, achats',
  },
  stock: {
    id: 'stock', label: 'Gestion stocks', group: 'stock_achats',
    href: '/stock', icon: Package, status: 'active', order: 51,
  },
  inventaire: {
    id: 'inventaire', label: 'Inventaire physique', group: 'stock_achats',
    href: '/stock?tab=inventaire', icon: ClipboardCheck, status: 'hidden', order: 52,
    description: 'Onglet de Gestion stocks — pas d’entrée nav séparée',
  },
  fournisseurs: {
    id: 'fournisseurs', label: 'Fournisseurs', group: 'stock_achats',
    href: '/fournisseurs', icon: Building2, status: 'active', order: 53,
  },
  achats: {
    id: 'achats', label: 'Achats', group: 'stock_achats',
    href: '/achats', icon: ShoppingBag, status: 'active', order: 54,
  },
  livraisons: {
    id: 'livraisons', label: 'Livraisons', group: 'logistique_livraison',
    href: '/livraisons', icon: Truck, status: 'active', order: 60,
  },
  factures: {
    id: 'factures', label: 'Factures', group: 'finance_caisse',
    href: '/factures', icon: Receipt, status: 'active', order: 70,
  },
  paiements: {
    id: 'paiements', label: 'Paiements', group: 'finance_caisse',
    href: '/paiements', icon: Banknote, status: 'active', order: 71,
  },
  caisse: {
    id: 'caisse', label: 'Caisse', group: 'finance_caisse',
    href: '/caisse', icon: Wallet, status: 'active', order: 72,
  },
  finance_charges: {
    id: 'finance_charges', label: 'Charges & dépenses', group: 'finance_caisse',
    href: '/finance/charges', icon: CircleDollarSign, status: 'active', order: 73,
    description: 'Finance avancée — sorties et trésorerie',
  },
  finance_couts: {
    id: 'finance_couts', label: 'Coûts de revient', group: 'finance_caisse',
    href: '/finance/couts-revient', icon: PieChart, status: 'active', order: 74,
  },
  finance_fiscalite: {
    id: 'finance_fiscalite', label: 'Fiscalité & échéances', group: 'finance_caisse',
    href: '/finance/fiscalite', icon: FileText, status: 'active', order: 76,
    description: 'Déclarations, TVA, rappels échéances',
  },
  finance_ventes_directes: {
    id: 'finance_ventes_directes', label: 'Ventes directes stock', group: 'finance_caisse',
    href: '/finance/ventes-directes', icon: Store, status: 'active', order: 75,
  },
  rapports: {
    id: 'rapports', label: 'Rapports & analyses', group: 'rapports_analyse',
    href: '/rapports', icon: BarChart3, status: 'active', order: 80,
    description: 'Analyse détaillée — distinct du cockpit temps réel',
  },
  rapports_performance: {
    id: 'rapports_performance', label: 'Performance machines & équipes', group: 'rapports_analyse',
    href: '/rapports/performance', icon: BarChart3, status: 'active', order: 81,
    description: 'Graphiques dédiés parc machine et scores RH',
  },
  aide: {
    id: 'aide', label: 'Centre d\'aide', group: 'communication_marketing',
    href: '/aide', icon: HelpCircle, status: 'active', order: 97,
    description: 'Guides rapides par métier ORION',
  },
  tarifs: {
    id: 'tarifs', label: 'Moteur de prix', group: 'administration_parametres',
    href: '/administration/catalogue-prix-stock', icon: Tag, status: 'hidden', order: 3,
    description: 'Studio Prix — formules, paliers et sync POS (archive PRIX 2026 séparée)',
  },
  config_hub: {
    id: 'config_hub', label: 'Catalogue POS', group: 'administration_parametres',
    href: '/administration/catalogue-prix-stock', icon: Settings2, status: 'hidden', order: 91,
    description: 'Alias — voir admin_hub',
  },
  historique: {
    id: 'historique', label: 'Historique & Audit', group: 'rapports_analyse',
    href: '/historique', icon: History, status: 'active', order: 100,
    description: 'Journal connexions et actions métier',
  },
  equipe_messages: {
    id: 'equipe_messages', label: 'ANS Talk', group: 'communication_marketing',
    href: '/messagerie', icon: MessageSquare, status: 'active', order: 98,
    description: 'Messagerie interne ANS Talk — chat, groupes commandes, fichiers',
  },
  equipe_suggestions: {
    id: 'equipe_suggestions', label: 'Suggestions & idées', group: 'communication_marketing',
    href: '/equipe/suggestions', icon: Lightbulb, status: 'active', order: 99,
    description: 'Boîte à idées — votes et statuts direction',
  },
  cm_campagnes: {
    id: 'cm_campagnes', label: 'Campagnes CM', group: 'communication_marketing',
    href: '/cm/campagnes', icon: Megaphone, status: 'active', order: 105,
    description: 'Campagnes social media — posts & planning',
  },
  cm_relances: {
    id: 'cm_relances', label: 'Relances clients', group: 'communication_marketing',
    href: '/cm/relances', icon: Send, status: 'active', order: 106,
    description: 'Templates messages — devis, factures, prospection',
  },
  equipe_taches: {
    id: 'equipe_taches', label: 'Tâches métier', group: 'gpao_production',
    href: '/equipe/taches', icon: ListTodo, status: 'active', order: 43,
    description: 'Tâches GPAO synchronisées commandes — chronomètre',
  },
  gpao_dossiers: {
    id: 'gpao_dossiers', label: 'Dossiers GPAO', group: 'gpao_production',
    href: '/production/dossiers', icon: FolderKanban, status: 'active', order: 44,
    description: '16 étapes liées aux modules (BAT, Planning, Tâches, Qualité, Livraison…)',
  },
  rh_employes: {
    id: 'rh_employes', label: 'Employés & pointage', group: 'rh_employes',
    href: '/rh/employes', icon: UsersRound, status: 'active', order: 112,
    description: 'Fiches employés, présences, retards',
  },
  rh_absences: {
    id: 'rh_absences', label: 'Congés & absences', group: 'rh_employes',
    href: '/rh/absences', icon: CalendarClock, status: 'active', order: 113,
  },
  rh_annonces: {
    id: 'rh_annonces', label: 'Annonces RH', group: 'rh_employes',
    href: '/rh/annonces', icon: Newspaper, status: 'active', order: 114,
  },
  parametres: {
    id: 'parametres', label: 'Mon compte', group: 'administration_parametres',
    href: '/parametres', icon: Settings, status: 'hidden', order: 101,
    description: 'Apparence & notifications — config métier dans Administration',
  },
  rh_soon: {
    id: 'rh_soon', label: 'RH avancée (paie)', group: 'rh_employes',
    href: '/rh/employes', icon: Layers, status: 'hidden', order: 115,
    description: 'Paie, évaluations — prochaine phase',
  },
  cm_soon: {
    id: 'cm_soon', label: 'Communication / CM', group: 'communication_marketing',
    href: '/cm/campagnes', icon: Megaphone, status: 'hidden', order: 111,
  },
  tech_ws: {
    id: 'tech_ws', label: 'Maintenance technique', group: 'maintenance_technique',
    href: '/workspace/maintenance', icon: Wrench, status: 'hidden', order: 55,
  },
};

/** Icônes centralisées via lib/icons/app-icons — mapping unique ANS ORION */
export const MODULE_REGISTRY: Record<string, OrionModule> = Object.fromEntries(
  Object.entries(MODULE_REGISTRY_BASE).map(([id, mod]) => [
    id,
    { ...mod, icon: getModuleIcon(id) },
  ]),
) as Record<string, OrionModule>;

export function getModule(id: string): OrionModule | undefined {
  return MODULE_REGISTRY[id];
}

export function listActiveModules(): OrionModule[] {
  return Object.values(MODULE_REGISTRY)
    .filter((m) => m.status === 'active')
    .sort((a, b) => a.order - b.order);
}
