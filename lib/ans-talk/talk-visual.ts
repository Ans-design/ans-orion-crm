import type { LucideIcon } from 'lucide-react';
import {
  User,
  Users,
  Package,
  PackageOpen,
  FileText,
  Factory,
  Truck,
  Palette,
  Wallet,
  Boxes,
  Megaphone,
  Hash,
  Flame,
  ClipboardList,
  Clock,
} from 'lucide-react';
import type { TalkConversation } from '@/lib/ans-talk/talk-types';

export type ConvKind = 'client' | 'team' | 'announce';

/** Priorité opérationnelle pour les dossiers clients (couleurs inbox). */
export type ConvPriority = 'urgent' | 'attention' | 'waiting' | 'normal';

export type ConvVisual = {
  icon: LucideIcon;
  tone: 'brand' | 'gold' | 'info' | 'success' | 'warning' | 'neutral' | 'team';
  label: string;
  /** Différencie commande client vs chat interne */
  kind: ConvKind;
};

const PRIORITY_LABEL: Record<ConvPriority, string> = {
  urgent: 'Urgent',
  attention: 'À traiter',
  waiting: 'En attente',
  normal: 'Suivi',
};

const TONE_CLASS: Record<ConvVisual['tone'], string> = {
  brand: 'talk-tone-brand',
  gold: 'talk-tone-gold',
  info: 'talk-tone-info',
  success: 'talk-tone-success',
  warning: 'talk-tone-warning',
  neutral: 'talk-tone-neutral',
  team: 'talk-tone-team',
};

function blobOf(c: TalkConversation) {
  return `${c.name} ${c.label ?? ''} ${c.description ?? ''}`.toLowerCase();
}

/**
 * Pictogramme + ton métier — ordre : signaux spécifiques avant « commande » générique
 * pour éviter que tous les dossiers clients aient le même Package.
 */
export function convVisual(c: TalkConversation): ConvVisual {
  const name = c.name.toLowerCase();
  const label = (c.label ?? '').toLowerCase();
  const blob = blobOf(c);

  if (name.includes('annonce') || label.includes('annonce')) {
    return { icon: Megaphone, tone: 'gold', label: 'Annonces', kind: 'announce' };
  }

  if (label.includes('bat') || name.includes('bat') || blob.includes('bon à tirer')) {
    return { icon: Palette, tone: 'warning', label: 'BAT', kind: 'client' };
  }
  if (c.type === 'devis' || name.includes('devis') || name.includes('proforma')) {
    return { icon: FileText, tone: 'info', label: 'Devis', kind: 'client' };
  }
  if (c.serviceKey === 'livraison' || name.includes('livraison') || blob.includes('expédition')) {
    return { icon: Truck, tone: 'info', label: 'Livraison', kind: 'client' };
  }
  if (
    c.type === 'dossier' ||
    c.serviceKey === 'production' ||
    name.includes('production') ||
    name.includes('gpao')
  ) {
    return { icon: Factory, tone: 'success', label: 'Production', kind: 'client' };
  }
  if (name.includes('finance') || name.includes('paiement') || name.includes('facture')) {
    return { icon: Wallet, tone: 'gold', label: 'Finance', kind: 'client' };
  }
  if (name.includes('stock') || name.includes('matière') || name.includes('matiere')) {
    return { icon: Boxes, tone: 'neutral', label: 'Stock', kind: 'client' };
  }
  if (blob.includes('brief') || blob.includes('studio') || c.serviceKey === 'studio') {
    return { icon: ClipboardList, tone: 'warning', label: 'Studio', kind: 'client' };
  }

  if (c.type === 'order' || c.commandeId) {
    // Variantes commande : picto distinct selon urgence / activité
    if (c.noResponse || blob.includes('urgent') || label.trim() === 'urgent') {
      return { icon: Flame, tone: 'brand', label: 'Commande', kind: 'client' };
    }
    if (blob.includes('attente') || blob.includes('validation')) {
      return { icon: Clock, tone: 'warning', label: 'Commande', kind: 'client' };
    }
    if (c.unreadCount > 0) {
      return { icon: PackageOpen, tone: 'brand', label: 'Commande', kind: 'client' };
    }
    return { icon: Package, tone: 'brand', label: 'Commande', kind: 'client' };
  }

  if (c.type === 'private') {
    return { icon: User, tone: 'team', label: 'Collègue', kind: 'team' };
  }
  if (c.type === 'group') {
    return { icon: Users, tone: 'team', label: 'Équipe', kind: 'team' };
  }
  if (c.type === 'service') {
    return { icon: Hash, tone: 'team', label: c.label ?? 'Service', kind: 'team' };
  }
  return { icon: Hash, tone: 'neutral', label: c.label ?? 'Canal', kind: 'team' };
}

export function convToneClass(tone: ConvVisual['tone']) {
  return TONE_CLASS[tone];
}

/**
 * Priorité visuelle d’un dossier client :
 * urgent (rouge) → sans réponse / libellé urgent
 * waiting (ambre) → BAT / validation
 * attention (vif) → non lus
 * normal → suivi courant
 */
export function convPriority(c: TalkConversation): ConvPriority {
  const blob = blobOf(c);
  if (
    c.noResponse ||
    blob.includes('urgent') ||
    (c.label ?? '').trim().toLowerCase() === 'urgent'
  ) {
    return 'urgent';
  }
  if (
    blob.includes('bat') ||
    blob.includes('validation') ||
    blob.includes('en attente') ||
    blob.includes('attente')
  ) {
    return 'waiting';
  }
  if (c.unreadCount > 0) return 'attention';
  return 'normal';
}

export function convPriorityLabel(p: ConvPriority) {
  return PRIORITY_LABEL[p];
}

/** Fenêtre SLA indicative (minutes) selon priorité — pour alerte durée. */
export function convSlaMinutes(p: ConvPriority): number {
  switch (p) {
    case 'urgent':
      return 120;
    case 'waiting':
      return 24 * 60;
    case 'attention':
      return 8 * 60;
    default:
      return 48 * 60;
  }
}

export function convSlaInfo(
  c: TalkConversation,
  priority: ConvPriority,
): {
  label: string;
  overdue: boolean;
  remainingMin: number;
} | null {
  if (priority === 'normal') return null;
  const iso = c.lastMessage?.createdAt ?? c.updatedAt;
  if (!iso) return null;
  const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  const windowMin = convSlaMinutes(priority);
  const remainingMin = windowMin - elapsedMin;
  const fmt = (m: number) => {
    const abs = Math.abs(m);
    if (abs < 60) return `${abs} min`;
    const h = Math.floor(abs / 60);
    if (h < 24) return `${h} h`;
    return `${Math.floor(h / 24)} j`;
  };
  if (remainingMin <= 0) {
    return { label: `Dépassé · ${fmt(remainingMin)}`, overdue: true, remainingMin };
  }
  return { label: `Reste · ${fmt(remainingMin)}`, overdue: false, remainingMin };
}

export function isClientConversation(c: TalkConversation) {
  return convVisual(c).kind === 'client';
}

/** Titre inbox compact : sans emoji / préfixe redondant. */
export function compactConvTitle(name: string): string {
  return name
    .replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '')
    .replace(/^(commande|dossier|devis|bat)\s*[#·•-]?\s*/i, '')
    .trim() || name;
}
