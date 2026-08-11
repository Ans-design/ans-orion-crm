'use client';

import { formatPriceAr, FR_THIN } from '@/lib/format/french-typography';
import type { CartTotals } from '@/lib/services/cart-service';

interface CartSummaryProps {
  totals: CartTotals;
  remise: number;
  acomptePct: number;
  livraison: number;
  onRemiseChange: (v: number) => void;
  onAcompteChange: (v: number) => void;
  onLivraisonChange: (v: number) => void;
  disabled?: boolean;
}

export function CartSummary({
  totals,
  remise,
  acomptePct,
  livraison,
  onRemiseChange,
  onAcompteChange,
  onLivraisonChange,
  disabled,
}: CartSummaryProps) {
  return (
    <div className="orion-card p-4 space-y-4">
      <h3 className="orion-text-card-title">Résumé commande</h3>

      <div className="space-y-2.5 text-sm leading-5">
        <Row label="Sous-total" value={formatPriceAr(totals.sousTotal)} />

        <div className="flex justify-between items-center gap-2">
          <span className="text-[var(--text-muted)]">Remise</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={remise}
              disabled={disabled}
              onChange={(e) => onRemiseChange(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              className="w-14 h-10 text-right orion-select-field font-mono text-xs"
              aria-label="Remise en pourcentage"
            />
            <span className="text-xs text-muted-foreground">{FR_THIN}%</span>
          </div>
        </div>
        {remise > 0 && <Row label="Montant remise" value={`-${formatPriceAr(totals.remiseAmount)}`} accent="warning" />}

        <div className="flex justify-between items-center gap-2">
          <span className="text-[var(--text-muted)]">Acompte</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={acomptePct}
              disabled={disabled}
              onChange={(e) => onAcompteChange(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              className="w-14 h-10 text-right orion-select-field font-mono text-xs"
              aria-label="Acompte en pourcentage"
            />
            <span className="text-xs text-muted-foreground">{FR_THIN}%</span>
          </div>
        </div>
        {acomptePct > 0 && <Row label="Montant acompte" value={formatPriceAr(totals.acompteAmount)} />}

        <Row label="Reste à payer" value={formatPriceAr(totals.resteAPayer)} bold />

        <div className="flex justify-between items-center gap-2 pt-1">
          <span className="text-[var(--text-muted)]">Livraison</span>
          <input
            type="number"
            min={0}
            step={1000}
            value={livraison}
            disabled={disabled}
            onChange={(e) => onLivraisonChange(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-28 h-10 text-right orion-select-field font-mono text-xs"
            aria-label="Frais de livraison"
          />
        </div>

        <div className="orion-surface-group pt-3 space-y-2">
          <Row label="Total général HT" value={formatPriceAr(totals.totalGeneral)} bold accent="primary" />
          <Row label={`TVA (20${FR_THIN}%)`} value={formatPriceAr(totals.tva)} muted />
          <Row label="Total TTC" value={formatPriceAr(totals.totalTTC)} bold accent="gold" />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  accent?: 'primary' | 'gold' | 'warning';
}) {
  const valueClass =
    accent === 'primary'
      ? 'text-primary'
      : accent === 'gold'
        ? 'text-[var(--ans-gold-500)]'
        : accent === 'warning'
          ? 'text-[var(--ans-orange-500)]'
          : '';

  return (
    <div className={`flex justify-between gap-2 ${muted ? 'text-xs text-[var(--text-muted)]' : ''}`}>
      <span className={bold ? 'font-semibold' : 'text-[var(--text-muted)]'}>{label}</span>
      <span className={`orion-text-amount ${bold ? '' : 'font-medium'} ${valueClass}`}>{value}</span>
    </div>
  );
}

export function computeClientTotals(
  items: { totalLigne: number }[],
  remise: number,
  acomptePct: number,
  livraison: number,
): CartTotals {
  const sousTotal = items.reduce((s, i) => s + i.totalLigne, 0);
  const remiseAmount = Math.round(sousTotal * remise / 100);
  const afterRemise = sousTotal - remiseAmount;
  const totalGeneral = afterRemise + livraison;
  const acompteAmount = Math.round(totalGeneral * acomptePct / 100);
  const resteAPayer = totalGeneral - acompteAmount;
  const tva = Math.round(totalGeneral * 0.2);
  const totalTTC = totalGeneral + tva;
  return { sousTotal, remiseAmount, afterRemise, livraison, totalGeneral, acompteAmount, resteAPayer, tva, totalTTC };
}
