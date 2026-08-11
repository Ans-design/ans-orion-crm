'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

type OrionLoginCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

/** Carte formulaire login — theme-aware, animation légère. */
export function OrionLoginCard({ title, subtitle, children, className = '' }: OrionLoginCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`orion-login-panel p-6 sm:p-8 ${className}`}
    >
      {title ? (
        <header className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-[var(--login-panel-title)]">{title}</h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm text-[var(--login-panel-muted)]">{subtitle}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </motion.div>
  );
}
