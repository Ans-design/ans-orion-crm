'use client';

import { useEffect, useMemo, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { X, Wallet, Plus, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import { PAYMENT_CHANNELS } from '@/lib/data/global-pricing';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';

export interface PosPaiementTarget {
  totalTTC: number;
  clientId?: string;
  label: string;
}

interface PayLine { mode: string; montant: number; reference: string }

interface PosPaiementModalProps {
  target: PosPaiementTarget | null;
  onClose: () => void;
  onSuccess: (receiptNum: string) => void;
}

export function PosPaiementModal({ target, onClose, onSuccess }: PosPaiementModalProps) {
  const [lines, setLines] = useState<PayLine[]>([{ mode: 'Espèces', montant: 0, reference: '' }]);
  const [montantRecu, setMontantRecu] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (target) {
      setLines([{ mode: 'Espèces', montant: target.totalTTC, reference: '' }]);
      setMontantRecu(target.totalTTC);
    }
  }, [target]);

  const totalPaye = useMemo(() => lines.reduce((s, l) => s + (l.montant || 0), 0), [lines]);
  const especesLine = lines.find((l) => l.mode === 'Espèces' || l.mode.includes('Esp'));
  const monnaie = especesLine && montantRecu > 0 ? Math.max(0, montantRecu - especesLine.montant) : 0;
  const reste = target ? Math.max(0, target.totalTTC - totalPaye) : 0;

  if (!target) return null;

  const updateLine = (i: number, patch: Partial<PayLine>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const handlePay = async () => {
    if (totalPaye <= 0) return uxToast.error('Montant invalide');
    if (totalPaye < target.totalTTC - 1) {
      return uxToast.error(`Il manque ${formatPrice(reste)} Ar — paiement partiel non autorisé sans validation`);
    }
    setLoading(true);
    try {
      const r = await fetch('/api/paiements/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'pos',
          clientId: target.clientId || null,
          totalAttendu: target.totalTTC,
          montantRecuEspeces: montantRecu,
          lines: lines.filter((l) => l.montant > 0),
          notes: target.label,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok) {
        const data = unwrapApiData<{ receiptNum?: string; total?: number }>(body);
        const receiptNum = data.receiptNum ?? '';
        uxToast.success(`Reçu ${receiptNum || '—'} — ${formatPrice(data.total ?? totalPaye)} Ar`);
        onSuccess(receiptNum);
        onClose();
      } else {
        uxToast.error(getApiErrorMessage(body, 'Erreur paiement'), 'Erreur paiement');
      }
    } catch {
      uxToast.error('Erreur réseau');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-backdrop backdrop-blur-sm">
      <div className="bg-card border border-border rounded-[7px] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-start">
          <div>
            <h3 className="font-display font-bold flex items-center gap-2"><Wallet size={20} className="text-primary" /> Paiement POS</h3>
            <p className="text-sm text-muted-foreground mt-1">{target.label}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-accent"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-[7px] bg-accent/50 p-2">
              <p className="text-muted-foreground">Total</p>
              <p className="font-mono font-bold">{formatPrice(target.totalTTC)}</p>
            </div>
            <div className="rounded-[7px] bg-primary/10 p-2">
              <p className="text-muted-foreground">Encaissé</p>
              <p className="font-mono font-bold text-primary">{formatPrice(totalPaye)}</p>
            </div>
            <div className="rounded-[7px] bg-orange-500/10 p-2">
              <p className="text-muted-foreground">Reste</p>
              <p className="font-mono font-bold text-orange-500">{formatPrice(reste)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Paiement mixte</label>
              <button type="button" onClick={() => setLines((p) => [...p, { mode: 'Mobile Money', montant: 0, reference: '' }])}
                className="text-xs text-primary flex items-center gap-1"><Plus size={12} /> Ligne</button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select value={line.mode} onChange={(e) => updateLine(i, { mode: e.target.value })}
                  className="flex-1 bg-accent border border-border rounded-lg px-2 py-2 text-xs">
                  {PAYMENT_CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <input type="number" value={line.montant || ''} onChange={(e) => updateLine(i, { montant: Number(e.target.value) || 0 })}
                  className="w-28 bg-accent border border-border rounded-lg px-2 py-2 text-xs font-mono" placeholder="Montant" />
                <input value={line.reference} onChange={(e) => updateLine(i, { reference: e.target.value })}
                  className="w-24 bg-accent border border-border rounded-lg px-2 py-2 text-xs hidden sm:block" placeholder="Réf." />
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines((p) => p.filter((_, j) => j !== i))} className="p-2 text-red-500"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>

          {especesLine && (
            <div className="rounded-[7px] border border-border p-3 space-y-2 bg-accent/30">
              <label className="text-xs font-semibold text-muted-foreground">Espèces — montant reçu</label>
              <input type="number" value={montantRecu || ''} onChange={(e) => setMontantRecu(Number(e.target.value) || 0)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono" />
              {monnaie > 0 && (
                <p className="text-sm font-semibold text-[#FFD60A]">Monnaie à rendre : {formatPrice(monnaie)} Ar</p>
              )}
            </div>
          )}

          <button type="button" onClick={handlePay} disabled={loading || totalPaye <= 0}
            className="w-full py-3 rounded-[7px] bg-primary text-white font-semibold disabled:opacity-50">
            {loading ? 'Traitement…' : `Encaisser ${formatPrice(totalPaye)} Ar`}
          </button>
        </div>
      </div>
    </div>
  );
}
