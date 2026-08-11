'use client';

import {
  MATERIAL_COMMERCIAL_USAGE_LABELS,
  resolveMaterialCommercialUsage,
  type MaterialCommercialUsageId,
} from '@/lib/backoffice/material-commercial-usage';
import { AppButton } from '@/components/ui/app-ui';

type UsageRow = {
  id: string;
  name?: string;
  materialKey?: string;
  grammage?: string | null;
  thickness?: string | null;
  family?: string | null;
  unit?: string | null;
  unitDisplay?: string | null;
  unitStandard?: string | null;
  conversionFactor?: number | null;
  purchasePrice?: number | null;
  blankSellPrice?: number | null;
  basePrintPrice?: number | null;
  publicationStatus?: string;
  active?: boolean;
  archived?: boolean;
  visiblePOS?: boolean;
  impactsStock?: boolean;
  impactsPrice?: boolean;
  stockItemId?: string | null;
  stockAvailable?: number | null;
  linkedArticlesCount?: number;
  anomaliesCount?: number;
  anomalies?: string[];
  anomalyNotes?: string | null;
};

type Props = {
  row: UsageRow | null;
  usage: {
    linkedArticles?: Array<{ id: string; name: string }>;
    stockItem?: { label: string; quantity: number; unit: string } | null;
  } | null;
  onClose: () => void;
  onAdjustStock?: () => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border/60 pb-3 last:border-0">
      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="space-y-1 text-sm">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value ?? '—'}</span>
    </div>
  );
}

/**
 * Profil matière — sections métier (§6.7 / §12), données réelles uniquement.
 */
export function MaterialUsageDrawer({ row, usage, onClose, onAdjustStock }: Props) {
  if (!row) return null;

  const usageId: MaterialCommercialUsageId = resolveMaterialCommercialUsage({
    active: row.active !== false,
    archived: row.archived,
    visiblePOS: Boolean(row.visiblePOS),
    impactsStock: row.impactsStock,
    impactsPrice: row.impactsPrice,
    blankSellPrice: row.blankSellPrice,
    linkedArticlesCount: row.linkedArticlesCount ?? usage?.linkedArticles?.length ?? 0,
    anomaliesCount: row.anomaliesCount ?? row.anomalies?.length ?? 0,
  });

  const money = (n: number | null | undefined) =>
    n == null ? '—' : `${n.toLocaleString('fr-FR')} Ar`;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-base font-semibold">Profil matière</h3>
          <p className="m-0 truncate text-xs text-muted-foreground">{row.name ?? row.materialKey}</p>
        </div>
        <AppButton type="button" variant="outline" className="shrink-0 text-xs" onClick={onClose}>
          Fermer
        </AppButton>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <Section title="1. Identité & classification">
          <Line label="Clé" value={row.materialKey} />
          <Line label="Famille" value={row.family} />
          <Line label="Grammage" value={row.grammage} />
          <Line label="Épaisseur" value={row.thickness} />
          <Line label="Publication" value={row.publicationStatus} />
        </Section>

        <Section title="2. Déclinaisons & formats">
          <Line label="Caractéristique" value={[row.grammage, row.thickness].filter(Boolean).join(' · ') || '—'} />
        </Section>

        <Section title="3. Unités & conversions">
          <Line label="Unité vente" value={row.unit} />
          <Line label="Affichage" value={row.unitDisplay} />
          <Line label="Standard" value={row.unitStandard} />
          <Line label="Coeff." value={row.conversionFactor} />
        </Section>

        <Section title="4. Achats & fournisseurs">
          <Line label="Coût d’achat" value={money(row.purchasePrice)} />
        </Section>

        <Section title="5. Coûts, charges & prix">
          <Line label="Prix vierge" value={money(row.blankSellPrice)} />
          <Line label="Prix impression" value={money(row.basePrintPrice)} />
        </Section>

        <Section title="6. Stock & mouvements">
          <Line
            label="Lien stock"
            value={
              usage?.stockItem
                ? `${usage.stockItem.label} — ${usage.stockItem.quantity} ${usage.stockItem.unit}`
                : row.stockItemId
                  ? `Lié (${row.stockAvailable ?? '—'})`
                  : 'Non lié'
            }
          />
          {onAdjustStock ? (
            <AppButton type="button" variant="outline" className="mt-1" onClick={onAdjustStock}>
              Ajuster le stock (mouvement)
            </AppButton>
          ) : (
            <p className="m-0 text-[11px] text-muted-foreground">
              Le stock ne s’édite pas en cellule — uniquement via mouvement traçable.
            </p>
          )}
        </Section>

        <Section title="7. Produits, formules & options">
          <ul className="m-0 max-h-28 list-none overflow-y-auto p-0">
            {(usage?.linkedArticles ?? []).length ? (
              usage!.linkedArticles!.map((a) => (
                <li key={a.id} className="border-b border-border/40 py-1 text-sm">
                  {a.name}
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">Aucun produit lié détecté</li>
            )}
          </ul>
        </Section>

        <Section title="8. Usage commercial & publication">
          <Line label="Usage" value={MATERIAL_COMMERCIAL_USAGE_LABELS[usageId]} />
          <Line label="Ex-flag Visible POS" value={row.visiblePOS ? 'oui' : 'non'} />
          <p className="m-0 text-[11px] text-muted-foreground">
            Une matière n’est pas automatiquement un article POS. Seule « Vendue directement »
            ou l’affectation produit expose le configurateur.
          </p>
        </Section>

        <Section title="9. Anomalies">
          {(row.anomalies ?? []).length ? (
            <ul className="m-0 list-disc pl-4 text-amber-700 dark:text-amber-200">
              {row.anomalies!.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-muted-foreground">Aucune anomalie listée</p>
          )}
          {row.anomalyNotes ? <p className="m-0 text-xs">{row.anomalyNotes}</p> : null}
        </Section>

        <Section title="10. Historique">
          <p className="m-0 text-[11px] text-muted-foreground">
            Journal détaillé : Domaine Données & contrôle → Historique (entité BaseMaterial).
          </p>
        </Section>
      </div>
    </div>
  );
}
