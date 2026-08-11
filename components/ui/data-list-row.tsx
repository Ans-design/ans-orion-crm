'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
  delay?: number;
};

/** Ligne de liste métier — devis, commandes, clients… */
export function DataListRow({
  icon,
  title,
  subtitle,
  meta,
  trailing,
  actions,
  onClick,
  className,
  delay = 0,
}: Props) {
  const interactive = Boolean(onClick);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={cn(
        'orion-data-row group',
        interactive && 'cursor-pointer',
        className,
      )}
    >
      {icon && <div className="orion-data-row-icon shrink-0">{icon}</div>}
      <div className="orion-data-row-body min-w-0 flex-1">
        <div className="orion-data-row-title">{title}</div>
        {subtitle && <div className="orion-data-row-subtitle">{subtitle}</div>}
        {meta && <div className="orion-data-row-meta">{meta}</div>}
      </div>
      {trailing && <div className="orion-data-row-trailing shrink-0 text-right">{trailing}</div>}
      {actions && (
        <div
          className="orion-data-row-actions shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </motion.div>
  );
}
