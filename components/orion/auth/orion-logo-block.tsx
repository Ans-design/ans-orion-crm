'use client';

import {
  BarChart3, Factory, ShoppingBag, Users, Wallet,
} from 'lucide-react';
import { OrionLogo } from '@/components/branding/orion-logo';

const MODULES = [
  { icon: Users, label: 'CRM' },
  { icon: ShoppingBag, label: 'POS' },
  { icon: Factory, label: 'GPAO' },
  { icon: Wallet, label: 'Finance' },
  { icon: BarChart3, label: 'RH' },
] as const;

type OrionLogoBlockProps = {
  companyName?: string;
  companySubtitle?: string;
  logoUrl?: string | null;
  compact?: boolean;
  demoBadge?: React.ReactNode;
};

/** Bloc branding ANS ORION — valeur + modules métier. */
export function OrionLogoBlock({
  companyName = 'ANS DESIGN PRINT',
  companySubtitle = 'ERP',
  logoUrl,
  compact = false,
  demoBadge,
}: OrionLogoBlockProps) {
  return (
    <div className={compact ? 'space-y-4' : 'space-y-8'}>
      <div>
        <OrionLogo
          size={compact ? 'md' : 'lg'}
          companyName={companyName}
          companySubtitle={companySubtitle}
          logoUrl={logoUrl}
          className={compact ? 'justify-center' : ''}
        />
        {demoBadge}
      </div>
      {!compact && (
        <div className="orion-logo-extended space-y-8">
          <div className="space-y-3 max-w-md">
            <p className="text-lg font-semibold leading-snug text-[var(--login-text-on-dark)]">
              Pilotez vos ventes, productions, commandes et livraisons depuis un seul espace.
            </p>
            <p className="text-sm leading-relaxed text-[var(--login-text-muted-on-dark)]">
              ANS ORION centralise votre activité print studio — du devis à la livraison.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Modules ORION">
            {MODULES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[var(--login-text-on-dark)] backdrop-blur-sm"
              >
                <Icon size={14} className="text-[var(--ans-yellow-soft)] shrink-0" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
