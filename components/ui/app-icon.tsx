'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getActionIcon,
  getModuleIcon,
  type ActionIconId,
  MODULE_ICONS,
  ACTION_ICONS,
} from '@/lib/icons/app-icons';
import { getIconSize, type IconSizeKey, type IconSizeLevel } from '@/lib/icons/icon-sizes';

type AppIconProps = {
  /** Icône Lucide directe */
  icon?: LucideIcon;
  /** Module registry id */
  module?: keyof typeof MODULE_ICONS | string;
  /** Action standard */
  action?: ActionIconId;
  size?: IconSizeKey | IconSizeLevel | number;
  className?: string;
  strokeWidth?: number;
  'aria-hidden'?: boolean;
};

export function AppIcon({
  icon,
  module,
  action,
  size = 'md',
  className,
  strokeWidth = 1.75,
  'aria-hidden': ariaHidden = true,
}: AppIconProps) {
  const Icon = icon
    ?? (action ? getActionIcon(action) : module ? getModuleIcon(module) : null);

  if (!Icon) return null;

  const px = typeof size === 'number' ? size : getIconSize(size);

  return (
    <Icon
      size={px}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      aria-hidden={ariaHidden}
    />
  );
}

export { MODULE_ICONS, ACTION_ICONS };
