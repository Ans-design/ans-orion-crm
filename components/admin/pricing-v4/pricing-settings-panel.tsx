'use client';

import Link from 'next/link';
import { Settings2, ToggleLeft, Tag } from 'lucide-react';
import { FusionMaterialsPanel } from '@/components/admin/fusion-admin-panels';
import { TarifsLegacyGrid } from '@/app/(app)/tarifs/components/TarifsLegacyGrid';

type Props = {
  canEdit: boolean;
  canViewMargin: boolean;
};

export function PricingSettingsPanel({ canEdit, canViewMargin }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-[7px] border border-border bg-accent/20 px-4 py-3 text-xs text-muted-foreground">
        Paramètres globaux du moteur — matières fusion, paliers legacy, TVA et feature flags POS.
        {!canViewMargin && ' Les variables marge sont réservées direction/finance.'}
      </div>

      <section className="space-y-3">
        <h3 className="orion-section-title">Matières & prix fusion</h3>
        <FusionMaterialsPanel canEdit={canEdit} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="orion-section-title">Variables POS (TVA, BAT, marges)</h3>
          <Link
            href="/administration/variables"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--orion-violet-soft)] text-[var(--orion-violet)] text-xs font-semibold hover:opacity-90"
          >
            <Tag size={12} /> Éditer variables →
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          TVA, remises max, frais BAT, marges — configurés dans le Backoffice (catalogue POS).
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="orion-section-title">Fonctions POS (prix forcé, promos)</h3>
          <Link
            href="/administration/parametres"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)] text-xs font-semibold hover:opacity-90"
          >
            <ToggleLeft size={12} /> Feature flags →
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="orion-section-title flex items-center gap-2">
            <Settings2 size={16} /> Paliers legacy (migration)
          </h3>
        </div>
        <p className="text-xs text-amber-500 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          Archive lecture — grilles historiques config-types. Le calcul POS utilise les profils publiés
          (Articles finis). Édition désactivée ici ; migrer via Backoffice.
        </p>
        <TarifsLegacyGrid readOnly />
      </section>
    </div>
  );
}
