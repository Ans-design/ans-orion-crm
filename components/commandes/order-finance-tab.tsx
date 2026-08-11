'use client';

import { CreditCard, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import type { OrderAcceptSnapshot } from '@/lib/commande/order-snapshot';
import { orderPaymentStatusLabel } from '@/lib/commande/order-status-labels';
import { OrderPaymentButton } from '@/components/commandes/order-payment-button';

type Paiement = { id: string; mode: string; montant: number };

type Props = {
  commandeId: string;
  commandeNumero: string;
  snapshot: OrderAcceptSnapshot | null;
  total: number;
  acompte: number;
  reste: number;
  clientId?: string | null;
  clientLabel?: string | null;
  paiements: Paiement[];
  margeEstimee?: number | null;
  margeEstimeePct?: number | null;
  onRefresh?: () => void;
};

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string | null;
  highlight?: 'green' | 'amber';
}) {
  if (!value?.trim()) return null;
  return (
    <div className="cmd-kv">
      <span className="cmd-kv__label">{label}</span>
      <span
        className={`cmd-kv__value ${
          highlight === 'green' ? 'is-ok' : highlight === 'amber' ? 'is-warn' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  Soldé: 'text-emerald-700 bg-emerald-500/12',
  'Non payé': 'text-muted-foreground bg-muted/40',
  Acompte: 'text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]',
  Partiel: 'text-amber-700 bg-amber-500/12',
};

export function OrderFinanceTab({
  commandeId, commandeNumero, snapshot, total, acompte, reste, clientId, clientLabel,
  paiements, margeEstimee, margeEstimeePct, onRefresh,
}: Props) {
  const payment = snapshot?.paymentSnapshot;
  const soldé = reste <= 0;
  const paymentStatus = orderPaymentStatusLabel(total, acompte, reste);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="cmd-panel-card">
        <h3 className="cmd-panel-card__title">
          <CreditCard size={13} className="text-primary" aria-hidden /> Paiement
        </h3>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[7px] w-fit ${STATUS_STYLE[paymentStatus] ?? STATUS_STYLE.Partiel}`}
        >
          {soldé ? <CheckCircle2 size={12} aria-hidden /> : null}
          {paymentStatus}
        </span>
        <div className="cmd-kv-list">
          <Row label="Mode" value={payment?.mode} />
          <Row label="Référence" value={payment?.reference} />
          <Row label="Heure" value={payment?.paymentTime} />
          <Row label="Payeur" value={payment?.payerName} />
          <Row label="Banque / opérateur" value={payment?.bankName ?? payment?.mobileMoneyProvider} />
        </div>
        {!soldé && (
          <OrderPaymentButton
            commandeId={commandeId}
            numero={commandeNumero}
            label={clientLabel ?? 'Commande'}
            total={total}
            dejaPaye={acompte}
            clientId={clientId}
            onSuccess={() => onRefresh?.()}
          />
        )}
        {paiements.length > 0 && (
          <div className="cmd-kv-list">
            <p className="cmd-panel-card__sub">Encaissements</p>
            {paiements.map((p) => (
              <div key={p.id} className="cmd-kv">
                <span className="cmd-kv__label">{p.mode}</span>
                <span className="cmd-kv__value tabular-nums">{formatPrice(p.montant)} Ar</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cmd-panel-card">
        <h3 className="cmd-panel-card__title">Résumé financier</h3>
        <div className="cmd-kv-list">
          <Row label="Total commande" value={`${formatPrice(total)} Ar`} />
          <Row label="Payé" value={`${formatPrice(acompte)} Ar`} highlight="green" />
          <Row label="Reste" value={`${formatPrice(reste)} Ar`} highlight={soldé ? 'green' : 'amber'} />
          <Row label="Statut" value={paymentStatus} highlight={soldé ? 'green' : 'amber'} />
          {margeEstimee != null && (
            <Row
              label={`Marge (${margeEstimeePct ?? 0}%)`}
              value={`${formatPrice(margeEstimee)} Ar`}
              highlight="green"
            />
          )}
        </div>
      </div>
    </div>
  );
}
