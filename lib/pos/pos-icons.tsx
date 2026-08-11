/**
 * Mapping icônes POS — Lucide à la place des emojis (charte SaaS claire).
 * Les données catalogue peuvent encore porter un emoji : on résout par catégorie / clé.
 */
import type { LucideIcon } from 'lucide-react';
import {
  BadgePercent,
  BookOpen,
  Box,
  Calendar,
  Camera,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Flame,
  Gift,
  Image,
  LayoutTemplate,
  Package,
  Palette,
  PartyPopper,
  PenLine,
  Printer,
  Shirt,
  Sparkles,
  Star,
  Store,
  StickyNote,
  Briefcase,
  Megaphone,
  Monitor,
  Wand2,
} from 'lucide-react';

const BY_CATEGORY: Record<string, LucideIcon> = {
  tous: Store,
  favoris: Star,
  recents: Clock,
  top: Flame,
  packaging: Package,
  calendrier: Calendar,
  notes: StickyNote,
  plv: LayoutTemplate,
  livres: BookOpen,
  carterie: CreditCard,
  flyers: FileText,
  finitions: Sparkles,
  grand_format: Image,
  textile: Shirt,
  goodies: Gift,
  evenementiel: PartyPopper,
  photo: Camera,
  document: ClipboardList,
  conception: Palette,
  impression: Printer,
  // Conception graphique
  identite: Palette,
  admin: Briefcase,
  marketing: Megaphone,
  edition: BookOpen,
  signaletique: LayoutTemplate,
  digital: Monitor,
  avance: Wand2,
};

const BY_EMOJI: Record<string, LucideIcon> = {
  '🏪': Store,
  '⭐': Star,
  '🕐': Clock,
  '🔥': Flame,
  '📦': Package,
  '📅': Calendar,
  '📝': StickyNote,
  '🪧': LayoutTemplate,
  '📚': BookOpen,
  '💳': CreditCard,
  '📄': FileText,
  '✨': Sparkles,
  '🖼️': Image,
  '👕': Shirt,
  '🎁': Gift,
  '🎉': PartyPopper,
  '📸': Camera,
  '📋': ClipboardList,
  '🎨': Palette,
  '🖨️': Printer,
  '🏷️': BadgePercent,
  '🔖': BadgePercent,
  '🛍️': Package,
  '🥤': Box,
  '📆': Calendar,
  '🗓️': Calendar,
  '🗂️': LayoutTemplate,
  '✖️': LayoutTemplate,
  '🚏': LayoutTemplate,
  '🚩': LayoutTemplate,
  '🖊️': PenLine,
};

export function resolvePosIcon(
  categoryOrKey?: string | null,
  emojiOrIcon?: string | null,
): LucideIcon {
  if (categoryOrKey && BY_CATEGORY[categoryOrKey]) return BY_CATEGORY[categoryOrKey];
  if (emojiOrIcon && BY_EMOJI[emojiOrIcon]) return BY_EMOJI[emojiOrIcon];
  if (emojiOrIcon && BY_CATEGORY[emojiOrIcon]) return BY_CATEGORY[emojiOrIcon];
  return Package;
}

export function PosIcon({
  category,
  icon,
  className,
  size = 20,
}: {
  category?: string | null;
  icon?: string | null;
  className?: string;
  size?: number;
}) {
  const Icon = resolvePosIcon(category, icon);
  return <Icon className={className} size={size} aria-hidden strokeWidth={1.75} />;
}
