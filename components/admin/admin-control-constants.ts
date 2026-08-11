import {
  Shield, Package, Layers, ToggleLeft, History, Tag, ImageIcon, UserPlus,
} from 'lucide-react';
import type { VisibilityMode } from '@/lib/admin-config/types';

import { administrationPathForTab } from '@/lib/administration/routes';

/** Tarification → /administration/* */
export const ADMIN_CONTROL_PRICING_REDIRECTS: Record<string, string> = {
  tarification: administrationPathForTab('articles'),
  prix2026: administrationPathForTab('prix2026'),
  matieres: administrationPathForTab('matieres'),
  anomalies: administrationPathForTab('anomalies'),
};

export const ADMIN_CONTROL_TABS = [
  { id: 'sante', label: 'Santé', icon: Shield },
  { id: 'articles', label: 'Articles', icon: Package },
  { id: 'apercus', label: 'Aperçus POS', icon: ImageIcon },
  { id: 'chips', label: 'Chips', icon: Layers },
  { id: 'variables', label: 'Variables', icon: Tag },
  { id: 'fonctions', label: 'Fonctions POS', icon: ToggleLeft },
  { id: 'versions', label: 'Versions', icon: History },
  { id: 'acces', label: 'Accès', icon: UserPlus },
] as const;

export type AdminControlTabId = (typeof ADMIN_CONTROL_TABS)[number]['id'];

export const VIS_LABELS: Record<VisibilityMode, string> = {
  ACTIVE: 'Actif',
  DISABLED_VISIBLE: 'Inactif visible',
  HIDDEN: 'Masqué',
  ADMIN_ONLY: 'Admin only',
  SCHEDULED: 'Planifié',
};

export const VIS_COLORS: Record<VisibilityMode, string> = {
  ACTIVE: 'text-green-500 bg-green-500/10',
  DISABLED_VISIBLE: 'text-orange-500 bg-orange-500/10',
  HIDDEN: 'text-gray-400 bg-gray-500/10',
  ADMIN_ONLY: 'text-purple-500 bg-purple-500/10',
  SCHEDULED: 'text-[var(--orion-red-vivid)] bg-[var(--orion-red-vivid)]/10',
};
