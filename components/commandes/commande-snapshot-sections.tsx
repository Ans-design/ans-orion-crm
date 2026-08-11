'use client';

import Link from 'next/link';
import { User, Package, Star, ChevronRight } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import type { OrderAcceptSnapshot } from '@/lib/commande/order-snapshot';
import { getCartItemConfigSummary, formatCartConfigSummaryLines } from '@/lib/cart-config-display';
import { paymentSummaryLabel } from '@/lib/commande/order-status-labels';

type Ligne = {
  articleId?: string | null;
  articleLabel: string;
  quantity: number;
  totalLigne: number;
  configSnapshot?: unknown;
};

type Props = {
  snapshot: OrderAcceptSnapshot | null;
  lignes: Ligne[];
  fallbackClient?: { name: string; tel?: string; email?: string; code?: string } | null;
  compact?: boolean;
  variant?: 'full' | 'summary';
  reste?: number;
  acompte?: number;
  onGoTab?: (tab: string) => void;
};

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="cmd-panel-card">
      <h3 className="cmd-panel-card__title">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="cmd-kv">
      <span className="cmd-kv__label">{label}</span>
      <span className="cmd-kv__value">{value}</span>
    </div>
  );
}

type GroupedLine = {
  articleLabel: string;
  quantity: number;
  totalLigne: number;
  configSummary: string;
  variantCount: number;
};

function groupLignes(lignes: Ligne[], snapshot: OrderAcceptSnapshot | null): GroupedLine[] {
  const map = new Map<string, GroupedLine>();
  lignes.forEach((l, i) => {
    const snapLine = snapshot?.itemsSnapshot?.[i];
    const configSummary =
      snapLine?.configSummary
      || formatCartConfigSummaryLines(
        getCartItemConfigSummary(
          (l.configSnapshot ?? {}) as Record<string, unknown>,
          l.articleId ?? '',
          l.quantity,
        ),
      );
    const key = `${l.articleLabel}::${configSummary}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += l.quantity;
      existing.totalLigne += l.totalLigne;
      existing.variantCount += 1;
    } else {
      map.set(key, {
        articleLabel: l.articleLabel,
        quantity: l.quantity,
        totalLigne: l.totalLigne,
        configSummary,
        variantCount: 1,
      });
    }
  });
  return [...map.values()];
}

export function CommandeSnapshotSections({
  snapshot,
  lignes,
  fallbackClient,
  compact = false,
  variant = 'full',
  reste = 0,
  acompte = 0,
  onGoTab,
}: Props) {
  const client = snapshot?.clientSnapshot;
  const grouped = groupLignes(lignes, snapshot);
  const isSummary = variant === 'summary';
  const logisticsLabel =
    snapshot?.logisticsSnapshot?.dateLivraison
      ? new Date(snapshot.logisticsSnapshot.dateLivraison).toLocaleDateString('fr-FR')
      : snapshot?.logisticsSnapshot?.modeExpedition ?? 'Voir livraison';

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 ${compact ? 'gap-2.5' : 'gap-3'}`}>
      <Section title="Client" icon={<User size={13} className="text-primary" aria-hidden />}>
        <div className="cmd-kv-list">
          <Row label="Nom" value={client?.clientName ?? fallbackClient?.name} />
          <Row label="Téléphone" value={client?.clientPhone ?? fallbackClient?.tel} />
          <Row label="Email" value={client?.clientEmail ?? fallbackClient?.email} />
          <Row label="NIF" value={client?.clientNif} />
          {!isSummary && (
            <>
              <Row label="Code" value={client?.code ?? fallbackClient?.code} />
              <Row label="WhatsApp" value={client?.clientWhatsapp} />
            </>
          )}
        </div>
        {client?.fidele && (
          <p className="cmd-panel-card__link flex items-center gap-1 mt-0.5" style={{ color: '#d97706' }}>
            <Star size={12} aria-hidden /> Client fidèle
          </p>
        )}
      </Section>

      <Section
        title={`Articles (${grouped.length})`}
        icon={<Package size={13} className="text-amber-500" aria-hidden />}
      >
        <div className={`space-y-2 ${compact ? 'max-h-[220px]' : 'max-h-[300px]'} overflow-y-auto pr-1`}>
          {grouped.map((g, i) => (
            <div key={i} className="pb-2 border-b border-border/25 last:border-0 last:pb-0">
              <div className="cmd-article-line">
                <span>
                  {g.articleLabel} ×{g.quantity}
                  {g.variantCount > 1 && (
                    <span className="cmd-kv__label ml-1">({g.variantCount} lignes)</span>
                  )}
                </span>
                <span className="cmd-article-line__price">{formatPrice(g.totalLigne)} Ar</span>
              </div>
              {g.configSummary ? (
                <p className="cmd-article-meta" title={g.configSummary}>
                  {g.configSummary}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      {isSummary ? (
        <div className="lg:col-span-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onGoTab?.('Finance')}
            className="flex-1 min-w-[140px] cmd-panel-card text-left hover:brightness-[0.98] transition-[filter]"
          >
            <p className="cmd-panel-card__sub">Paiement</p>
            <p className="cmd-panel-card__value">{paymentSummaryLabel(reste, acompte)}</p>
            <span className="cmd-panel-card__link inline-flex items-center gap-0.5 mt-1">
              Détail Finance <ChevronRight size={12} aria-hidden />
            </span>
          </button>
          <button
            type="button"
            onClick={() => onGoTab?.('Logistique')}
            className="flex-1 min-w-[140px] cmd-panel-card text-left hover:brightness-[0.98] transition-[filter]"
          >
            <p className="cmd-panel-card__sub">Logistique</p>
            <p className="cmd-panel-card__value truncate" title={logisticsLabel}>
              {logisticsLabel}
            </p>
            <span className="cmd-panel-card__link inline-flex items-center gap-0.5 mt-1">
              Détail Logistique <ChevronRight size={12} aria-hidden />
            </span>
          </button>
          {snapshot?.devisNumero && (
            <Link
              href={`/devis?id=${snapshot.devisId}`}
              className="flex-1 min-w-[140px] cmd-panel-card hover:brightness-[0.98] transition-[filter]"
            >
              <p className="cmd-panel-card__sub">Devis source</p>
              <p className="cmd-panel-card__value font-mono">{snapshot.devisNumero}</p>
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
