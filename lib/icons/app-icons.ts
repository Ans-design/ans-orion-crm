import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Activity, BarChart3, TrendingUp, History,
  Users, Store, ShoppingCart, FileText, ClipboardList, MessageCircleWarning,
  FolderCog, Kanban, CalendarDays, ListChecks, BadgeCheck, Recycle, Factory,
  Palette, ClipboardPen, Files, PenTool, FileCheck, PrinterCheck,
  Boxes, Warehouse, ShoppingBag, Truck, Route, Building2,
  ReceiptText, CreditCard, Wallet, Banknote, Calculator, Landmark,
  UsersRound, UserPlus, CalendarOff, BadgeDollarSign, UserCircle, Newspaper, Trophy,
  MessageSquare, Lightbulb, Megaphone, Send, Bell, CircleHelp,
  Settings, Shield, RefreshCw, DownloadCloud, Download, Radio, SlidersHorizontal,
  Layers, FolderTree, Tag, Package, LayoutGrid, Wrench, MonitorCog,
  Ticket, Scissors, Smartphone, Headphones, Printer, Briefcase,
  Settings2, Monitor, ClipboardCheck,
  Eye, Pencil, Copy, Upload, Filter, ArrowUpDown, CheckCircle, XCircle, X,
  ArrowLeft, ArrowRight, TriangleAlert, Info, Search, Plus, PlusCircle,
  GitBranch, UploadCloud, Trash2,
} from 'lucide-react';

/** Univers sidebar — icônes distinctes des modules enfants */
export const UNIVERSE_ICONS = {
  pilotage: LayoutDashboard,
  commercial: ShoppingCart,
  production: Factory,
  studio: Palette,
  stock: Boxes,
  logistique: Truck,
  finance: Wallet,
  rh: UsersRound,
  communication: Megaphone,
  administration: Shield,
  mon_espace: UserCircle,
} as const;

/** Actions globales — une icône = une action partout */
export const ACTION_ICONS = {
  view: Eye,
  edit: Pencil,
  delete: Trash2,
  duplicate: Copy,
  download: Download,
  upload: Upload,
  import: UploadCloud,
  export: DownloadCloud,
  add: Plus,
  create: PlusCircle,
  search: Search,
  filter: Filter,
  sort: ArrowUpDown,
  validate: CheckCircle,
  cancel: XCircle,
  close: X,
  back: ArrowLeft,
  next: ArrowRight,
  send: Send,
  print: Printer,
  pdf: FileText,
  history: History,
  warning: TriangleAlert,
  info: Info,
  success: CheckCircle,
  sync: RefreshCw,
  settings: Settings,
} as const;

/** Modules navigation — mapping officiel ANS ORION */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  // Pilotage
  cockpit: LayoutDashboard,
  operations: Activity,
  rapports: BarChart3,
  rapports_performance: TrendingUp,
  historique: History,

  // Commercial
  clients: Users,
  pos: Store,
  panier: ShoppingCart,
  devis: FileText,
  commandes: ClipboardList,
  reclamations: MessageCircleWarning,
  ws_commercial: Briefcase,

  // Production
  gpao_dossiers: FolderCog,
  production: Kanban,
  planning: CalendarDays,
  equipe_taches: ListChecks,
  qualite: BadgeCheck,
  plan_matiere: Recycle,
  inventaire: ClipboardCheck,
  ws_production: Factory,
  ws_faconnage: Scissors,
  ws_conducteur: Printer,

  // Studio & BAT
  studio_hub: Palette,
  studio_briefs: ClipboardPen,
  studio_fichiers: Files,
  conception: PenTool,
  bat: FileCheck,
  prepresse: PrinterCheck,
  ws_studio: Palette,

  // Stock & achats
  stock: Boxes,
  ws_magasin: Warehouse,
  achats: ShoppingBag,
  fournisseurs: Building2,
  materiels: MonitorCog,
  machines: Wrench,
  maintenance_tickets: Ticket,
  rh_equipements: Monitor,
  ws_maintenance: Wrench,

  // Logistique
  livraisons: Truck,
  ws_logistique: Route,

  // Finance
  ws_finance: Wallet,
  factures: ReceiptText,
  paiements: CreditCard,
  finance_charges: Banknote,
  finance_couts: Calculator,
  finance_fiscalite: Landmark,
  finance_ventes_directes: Store,
  caisse: Wallet,

  // RH
  rh_employes: UsersRound,
  rh_recruitment: UserPlus,
  rh_absences: CalendarOff,
  rh_performance: Trophy,
  rh_paie: BadgeDollarSign,
  rh_annonces: Newspaper,
  rh_mon_profil: UserCircle,
  ws_accueil: Headphones,

  // Communication
  equipe_messages: MessageSquare,
  equipe_suggestions: Lightbulb,
  cm_campagnes: Megaphone,
  cm_relances: Send,
  cm_notifications: Bell,
  aide: CircleHelp,
  ws_cm: Smartphone,

  // Administration
  admin_backoffice: Settings,
  admin_overview: LayoutDashboard,
  admin_catalogue: Boxes,
  admin_modeles_articles: FolderTree,
  admin_prix_nav: Calculator,
  admin_variables_nav: SlidersHorizontal,
  admin_matieres_nav: Package,
  admin_flux_statuts: GitBranch,
  admin_synchronisation: RefreshCw,
  admin_import_export: DownloadCloud,
  admin_annexes: Building2,
  admin_permissions: Shield,
  admin_ticker: Radio,
  parametres: Settings,
  admin_home: LayoutGrid,
  admin_hub: SlidersHorizontal,
  tarifs: Tag,
  config_hub: Settings2,

  // Legacy / hidden aliases
  rh_soon: Layers,
  cm_soon: Megaphone,
  tech_ws: Wrench,
};

export type ModuleIconId = keyof typeof MODULE_ICONS;
export type ActionIconId = keyof typeof ACTION_ICONS;

export function getModuleIcon(moduleId: string): LucideIcon {
  return MODULE_ICONS[moduleId] ?? LayoutDashboard;
}

export function getActionIcon(actionId: ActionIconId): LucideIcon {
  return ACTION_ICONS[actionId];
}
