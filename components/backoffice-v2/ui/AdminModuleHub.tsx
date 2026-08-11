'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { AdminMacroModule, AdminMicroItem } from '@/lib/administration/admin-macro-modules';

type Props = {
  macro: AdminMacroModule;
  onNavigate?: (href: string) => void;
};

export function AdminModuleHub({ macro, onNavigate }: Props) {
  return (
    <div className="orion-admin-hub">
      <header className="orion-admin-hub-header">
        <h1 className="orion-admin-hub-title">{macro.label}</h1>
        <p className="orion-admin-hub-desc">{macro.description}</p>
        <p className="orion-admin-hub-hint">
          Choisissez un sous-module — aucun sous-menu dans la barre latérale.
        </p>
      </header>

      <div className="orion-admin-hub-grid">
        {macro.microItems.filter((m) => !m.hidden).map((micro) => (
          <HubCard key={micro.id} micro={micro} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function HubCard({
  micro,
  onNavigate,
}: {
  micro: AdminMicroItem;
  onNavigate?: (href: string) => void;
}) {
  const Icon = micro.icon;

  return (
    <Link
      href={micro.href}
      className="orion-admin-hub-card"
      onClick={() => onNavigate?.(micro.href)}
    >
      <div className="orion-admin-hub-card-top">
        <div className="orion-admin-hub-card-icon" aria-hidden>
          <Icon size={22} />
        </div>
        <ChevronRight size={18} className="orion-admin-hub-card-arrow" aria-hidden />
      </div>
      <h3 className="orion-admin-hub-card-title">{micro.label}</h3>
      <p className="orion-admin-hub-card-desc">{micro.description}</p>
    </Link>
  );
}
