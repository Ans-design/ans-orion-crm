'use client';

import { useEffect, useMemo, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { X, Wallet, CreditCard, Receipt, FileText } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import { liveFetch, emitOrionLive } from '@/lib/live/orion-live';
import { unwrapApiData } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export interface EncaissementTarget {
  id: string;
  numero: string;
  label: string;
  totalTTC: number;
  dejaPaye: number;
  factureId?: string;
  commandeId?: string;
  clientId?: string;
}

interface EncaissementModalProps {
  target: EncaissementTarget | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BASE_MODES = [
  { key: 'Espèces', label: 'Espèces', icon: '💵' },
  { key: 'Mobile Money', label: 'Mobile Money', icon: '📱' },
  { key: 'Virement', label: 'Virement bancaire', icon: '🏦' },
  { key: 'Chèque', label: 'Chèque', icon: '📝' },
  { key: 'Carte', label: 'Carte bancaire', icon: '💳' },
] as const;

const MOBILE_PROVIDERS = ['Mvola', 'Orange Money', 'Airtel Money'] as const;

function referenceRequired(mode: string, mobileProvider: string): boolean {
  if (mode === 'Mobile Money') return true;
  return ['Virement', 'Chèque', 'Carte'].includes(mode);
}

function defaultPaymentTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function EncaissementModal({ target, onClose, onSuccess }: EncaissementModalProps) {
  const [montant, setMontant] = useState(0);
  const [mode, setMode] = useState<string>('Espèces');
  const [mobileProvider, setMobileProvider] = useState<(typeof MOBILE_PROVIDERS)[number]>('Mvola');
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [paymentTime, setPaymentTime] = useState(defaultPaymentTimeLocal());
  const [payerName, setPayerName] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'Acompte' | 'Solde' | 'Paiement total'>('Solde');
  const [printFormat, setPrintFormat] = useState<'ticket' | 'facture'>('facture');
  const [loading, setLoading] = useState(false);

  const reste = target ? Math.max(0, target.totalTTC - target.dejaPaye) : 0;
  const needsReference = useMemo(() => referenceRequired(mode, mobileProvider), [mode, mobileProvider]);
  const needsBank = mode === 'Virement' || mode === 'Chèque';

  useEffect(() => {
    if (target) {
      setMontant(Math.max(0, target.totalTTC - target.dejaPaye));
      setPaymentTime(defaultPaymentTimeLocal());
      setReference('');
      setNote('');
      setPrintFormat('facture');
    }
  }, [target]);

  if (!target) return null;

  const handlePay = async () => {
    if (montant <= 0) return uxToast.error('Montant invalide');
    if (montant > reste + 1) return uxToast.error('Montant supérieur au reste à payer');
    if (needsReference && !reference.trim()) return uxToast.error('Référence obligatoire pour ce mode');
    if (needsBank && !bankName.trim()) return uxToast.error('Banque / émetteur obligatoire');

    setLoading(true);
    try {
      const r = await liveFetch('/api/paiements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factureId: target.factureId,
          commandeId: target.commandeId,
          clientId: target.clientId,
          montant,
          mode,
          mobileMoneyProvider: mode === 'Mobile Money' ? mobileProvider : null,
          bankName: needsBank ? bankName.trim() : null,
          reference: reference.trim() || null,
          paymentTime: paymentTime || null,
          payerName: payerName.trim() || null,
          notes: note.trim() || null,
          type: type === 'Paiement total' ? 'Solde' : type,
          printFormat,
        }),
      });
      if (r.ok) {
        const raw = await r.json();
        const data = unwrapApiData<{
          factureId?: string | null;
          printFormat?: string;
          id?: string;
        }>(raw);
        const facId = data.factureId || target.factureId;
        const fmt = data.printFormat === 'ticket' ? 'ticket' : printFormat;
        uxToast.success(`Encaissement ${formatPrice(montant)} Ar enregistré`);
        emitOrionLive('paiements', { source: 'encaissement' });
        emitOrionLive('commandes', { entityId: target.commandeId, source: 'encaissement', skipNav: true });
        emitOrionLive('factures', { entityId: facId || undefined, source: 'encaissement', skipNav: true });
        if (facId) {
          window.open(`/api/factures/${facId}/pdf?print=${fmt}&format=html`, '_blank', 'noopener,noreferrer');
        }
        onSuccess();
        onClose();
      } else {
        const err = await r.json();
        uxToast.error(getApiErrorMessage(err, 'Erreur encaissement'), 'Erreur encaissement');
      }
    } catch {
      uxToast.error('Erreur réseau');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-backdrop backdrop-blur-sm">
      <div className="bg-card border border-border rounded-[7px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-border flex items-start justify-between">
          <div>
            <h3 className="font-display font-bold flex items-center gap-2"><Wallet size={20} className="text-green-500" /> Encaissement</h3>
            <p className="text-sm text-muted-foreground mt-1">{target.numero} — {target.label}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-accent"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 p-5">
          <div className="bg-accent/50 rounded-[7px] p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Total TTC</p>
            <p className="font-mono font-bold text-sm mt-1">{formatPrice(target.totalTTC)}</p>
          </div>
          <div className="bg-green-500/10 rounded-[7px] p-3 text-center">
            <p className="text-[10px] text-green-600 uppercase">Déjà encaissé</p>
            <p className="font-mono font-bold text-sm mt-1 text-green-600">{formatPrice(target.dejaPaye)}</p>
          </div>
          <div className="bg-red-500/10 rounded-[7px] p-3 text-center">
            <p className="text-[10px] text-red-500 uppercase">Reste à payer</p>
            <p className="font-mono font-bold text-sm mt-1 text-red-500">{formatPrice(reste)}</p>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Document à remettre</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrintFormat('ticket')}
                className={cn(
                  'flex items-start gap-2 rounded-[7px] border-2 p-3 text-left transition-all',
                  printFormat === 'ticket'
                    ? 'border-[var(--accent-primary,#FF174D)] bg-[color-mix(in_srgb,var(--accent-primary,#FF174D)_8%,transparent)]'
                    : 'border-border hover:border-muted-foreground/40',
                )}
                aria-pressed={printFormat === 'ticket'}
              >
                <Receipt size={18} className="shrink-0 mt-0.5 text-[var(--accent-primary,#FF174D)]" />
                <span>
                  <span className="block text-sm font-semibold">Ticket</span>
                  <span className="block text-[11px] text-muted-foreground">Version simplifiée</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('facture')}
                className={cn(
                  'flex items-start gap-2 rounded-[7px] border-2 p-3 text-left transition-all',
                  printFormat === 'facture'
                    ? 'border-[var(--accent-primary,#FF174D)] bg-[color-mix(in_srgb,var(--accent-primary,#FF174D)_8%,transparent)]'
                    : 'border-border hover:border-muted-foreground/40',
                )}
                aria-pressed={printFormat === 'facture'}
              >
                <FileText size={18} className="shrink-0 mt-0.5 text-[var(--accent-primary,#FF174D)]" />
                <span>
                  <span className="block text-sm font-semibold">Facture</span>
                  <span className="block text-[11px] text-muted-foreground">Forme complète</span>
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Montant reçu (max: {formatPrice(reste)} Ar)</label>
            <input type="number" value={montant || ''} onChange={(e) => setMontant(Number(e.target.value) || 0)} max={reste}
              className="w-full bg-accent border border-orange-500/30 rounded-lg px-4 py-3 font-mono text-lg outline-none focus:ring-2 focus:ring-orange-500/30" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm">
                <option value="Acompte">Acompte</option>
                <option value="Solde">Solde</option>
                <option value="Paiement total">Paiement total</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm">
                {BASE_MODES.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>

          {mode === 'Mobile Money' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Opérateur Mobile Money</label>
              <select value={mobileProvider} onChange={(e) => setMobileProvider(e.target.value as typeof mobileProvider)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm">
                {MOBILE_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          {needsBank && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Banque / émetteur</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm" placeholder="BNI, BOA, Société Générale…" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Référence {needsReference ? '(obligatoire)' : '(optionnel)'}
              </label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm font-mono" placeholder="N° transaction, chèque…" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date / heure</label>
              <input type="datetime-local" value={paymentTime} onChange={(e) => setPaymentTime(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Payeur (optionnel)</label>
            <input value={payerName} onChange={(e) => setPayerName(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm" placeholder="Nom du payeur" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Note interne</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Commentaire encaissement…" />
          </div>

          <button type="button" onClick={() => void handlePay()} disabled={loading || montant <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[7px] bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50">
            <CreditCard size={18} /> {loading ? 'Traitement…' : 'Encaisser'}
          </button>
        </div>
      </div>
    </div>
  );
}
