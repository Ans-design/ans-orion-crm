'use client';

import Link from 'next/link';
import { Palette, Bell } from 'lucide-react';
import { AppPageHeader } from '@/components/ui/app-ui';
import { ANS } from '@/lib/ans-colors';

/**
 * Mon compte — préférences personnelles uniquement.
 * Config métier (formules, sync, flux, rôles) → sidebar Administration uniquement.
 */
const PERSONAL = [
  {
    icon: Palette,
    label: 'Apparence',
    desc: 'Thème clair / sombre et accent',
    href: '/parametres/apparence',
    color: ANS.red,
  },
  {
    icon: Bell,
    label: 'Notifications',
    desc: 'Alertes devis, commandes, production',
    href: '/parametres/notifications',
    color: '#F59E0B',
  },
];

export default function ParametresPage() {
  return (
    <div className="dashboard-full space-y-6 w-full max-w-none">
      <AppPageHeader
        title="Mon compte"
        description="Préférences personnelles — formules, moteurs et config métier sont dans Administration."
      />

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Préférences
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PERSONAL.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bg-card border border-border rounded-[7px] p-4 transition-all hover:shadow-lg hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-[7px] flex items-center justify-center bg-accent"
                    style={{ color: item.color }}
                  >
                    <Icon size={18} aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.label}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
