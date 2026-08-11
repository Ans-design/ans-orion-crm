'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { CheckCircle2, Loader2, Star, Truck, CreditCard, Wallet, AlertTriangle } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import {
  type DevisValidationMeta,
  DEFAULT_DEVIS_META,
  enrichPaymentMeta,
  resolvePaymentMode,
  serializeDevisNotes,
  type PaymentChip,
  type PaymentMode,
  type MobileMoneyProvider,
  EXPEDITION_OPTIONS,
  DELAI_OPTIONS,
  PRIORITE_OPTIONS,
} from '@/lib/devis-meta';
import {
  type ClientForLogistics,
  isClientFideleFromRecord,
  mergeLogisticsWithClientDefaults,
  syncDeliveryFromMain,
  validateQuoteLogistics,
  validateQuotePayment,
  formatLogisticsRecap,
  LIVRAISON_AXES,
} from '@/lib/devis/logistics';
import { AppButton } from '@/components/ui/app-ui';
import { serializeClientCharte } from '@/lib/client-charte';

type Props = {
  devisId: string;
  clientId?: string | null;
  client?: ClientForLogistics | null;
  totalTTC: number;
  initialMeta: DevisValidationMeta | null;
  userNotes: string;
  clientEmail?: string | null;
  canValidate: boolean;
  onSaved: () => void;
};

const MM_STYLES: Record<MobileMoneyProvider, { active: string; idle: string }> = {
  Mvola: {
    active: 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/40',
    idle: 'border-border hover:border-emerald-500/40',
  },
  'Airtel Money': {
    active: 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 ring-2 ring-red-500/40',
    idle: 'border-border hover:border-red-500/40',
  },
  'Orange Money': {
    active: 'border-orange-500 bg-orange-500/10 text-orange-800 dark:text-orange-300 ring-2 ring-orange-500/40',
    idle: 'border-border hover:border-orange-500/40',
  },
};

export function DevisValidationPanel({
  devisId,
  clientId,
  client,
  totalTTC,
  initialMeta,
  userNotes,
  clientEmail,
  canValidate,
  onSaved,
}: Props) {
  const router = useRouter();
  const [meta, setMeta] = useState<DevisValidationMeta>(() =>
    mergeLogisticsWithClientDefaults(
      { ...DEFAULT_DEVIS_META, ...initialMeta, paymentMode: resolvePaymentMode(initialMeta) },
      client ?? null,
    ),
  );
  const [customMontant, setCustomMontant] = useState(
    String(initialMeta?.montantPaye && initialMeta.paymentChip === 'custom' ? initialMeta.montantPaye : ''),
  );
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (client && !initialMeta?.logistics?.clientName) {
      setMeta((m) => mergeLogisticsWithClientDefaults(m, client));
    }
  }, [client, initialMeta?.logistics?.clientName]);

  const enriched = useMemo(() => {
    const draft = { ...meta };
    if (meta.paymentChip === 'custom') draft.montantPaye = Number(customMontant) || 0;
    return enrichPaymentMeta(draft, totalTTC);
  }, [meta, customMontant, totalTTC]);

  const logisticsRecap = useMemo(() => formatLogisticsRecap(meta), [meta]);
  const clientFidele = client ? isClientFideleFromRecord(client) : false;
  const logistics = meta.logistics ?? {};

  const logisticsMissing = {
    expedition: !meta.modeExpedition?.trim(),
    dateLiv: !meta.dateLivraison?.trim(),
    delai: !meta.delaiExecution?.trim(),
  };
  const hasLogisticsAlerts = logisticsMissing.expedition || logisticsMissing.dateLiv || logisticsMissing.delai;

  const saveMeta = async (nextMeta: DevisValidationMeta) => {
    const notes = serializeDevisNotes(enrichPaymentMeta(nextMeta, totalTTC), userNotes);
    const r = await fetch(`/api/devis/${devisId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(getApiErrorMessage(err, 'Enregistrement impossible'));
    }
  };

  const maybeSaveAddressToClient = async () => {
    if (!clientId || !meta.logistics?.saveAddressToClient) return;
    const l = meta.logistics;
    const charte = serializeClientCharte({
      addresses: [
        {
          label: 'Principale',
          axe: l.deliveryAxis?.startsWith('Autre') ? `Autre — ${l.deliveryAxis}` : (l.deliveryAxis ?? ''),
          repere: l.deliveryAddress ?? l.deliveryLandmark ?? '',
        },
      ],
    });
    await fetch(`/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adresse: l.deliveryAddress, charte }),
    }).catch(() => {});
  };

  const patchMeta = (patch: Partial<DevisValidationMeta>) => setMeta((m) => ({ ...m, ...patch }));

  const patchLogistics = (patch: Partial<typeof logistics>) => {
    setMeta((m) => ({ ...m, logistics: { ...m.logistics, ...patch } }));
  };

  const toggleUseMainAddress = (checked: boolean) => {
    const next = syncDeliveryFromMain({ ...logistics, saveAddressToClient: logistics.saveAddressToClient ?? false }, checked);
    patchMeta({ logistics: next });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMeta({ ...meta, montantPaye: enriched.montantPaye, resteAPayer: enriched.resteAPayer });
      await maybeSaveAddressToClient();
      uxToast.success('Informations enregistrées');
      onSaved();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleValidateCommande = async () => {
    const logErrors = validateQuoteLogistics(meta);
    const payErrors = validateQuotePayment(meta, totalTTC, enriched.montantPaye ?? 0);
    const allErrors = [...logErrors, ...payErrors];
    if (allErrors.length) {
      uxToast.error(allErrors[0]);
      return;
    }

    setValidating(true);
    try {
      await saveMeta({ ...meta, montantPaye: enriched.montantPaye, resteAPayer: enriched.resteAPayer });
      await maybeSaveAddressToClient();

      if (clientId && (enriched.montantPaye ?? 0) > 0) {
        const modeLabel =
          meta.paymentMode === 'Especes' ? 'Espèces'
          : meta.paymentMode === 'Cheque' ? 'Chèque'
          : meta.paymentMode === 'Virement' ? `Virement${meta.bankName ? ` (${meta.bankName})` : ''}`
          : meta.mobileMoneyProvider ?? 'Mobile Money';
        const payRes = await fetch('/api/paiements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            devisId,
            clientId,
            montant: enriched.montantPaye,
            mode: modeLabel,
            reference: meta.referencePaiement?.trim() || undefined,
            type: (enriched.resteAPayer ?? 0) > 0 ? 'Acompte' : 'Paiement',
            notes: [meta.paymentTime ? `Heure: ${meta.paymentTime}` : '', meta.paymentNote].filter(Boolean).join(' · ') || 'Encaissement validation commande',
          }),
        });
        if (!payRes.ok) {
          const err = await payRes.json().catch(() => ({}));
          uxToast.error((err as { error?: string }).error, 'Enregistrement du paiement impossible');
          return;
        }
      }

      const res = await fetch(`/api/devis/${devisId}/accept`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        uxToast.error((data as { error?: string }).error, 'Validation impossible');
        return;
      }
      const commandeId = (data as { commande?: { id: string; numero: string } }).commande?.id;
      const numero = (data as { commande?: { numero: string } }).commande?.numero;
      uxToast.success(numero ? `Commande ${numero} créée` : 'Commande validée');
      void import('@/lib/commercial/commercial-journey-store').then(({ emitCommercialJourney }) => {
        emitCommercialJourney('devis_confirmed', {
          lastDevisId: devisId,
          lastCommandeId: commandeId ?? null,
          cartCount: 0,
        });
      });
      onSaved();
      router.push(commandeId ? `/commandes/${commandeId}` : '/commandes');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {/* ——— LOGISTIQUE ——— */}
      <section className="orion-surface-card-soft overflow-hidden h-full">
        <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--bg-chip)]">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-primary" />
            <div>
              <h3 className="text-sm font-bold">Logistique & livraison</h3>
              <p className="text-[11px] text-muted-foreground">
                Informations reprises depuis la fiche client, modifiables pour ce devis.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
            Ces informations sont reprises depuis la fiche client. Vous pouvez les ajuster pour ce devis sans modifier la fiche client.
          </p>

          {client && (
            <div className="orion-surface-group space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client sélectionné</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm">{logistics.clientName ?? client.name}</span>
                {clientFidele && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--orion-yellow)]/15 text-[var(--orion-yellow)]">
                    <Star size={10} /> Client fidèle
                  </span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {logistics.clientPhone && <p>Tél. {logistics.clientPhone}</p>}
                {logistics.clientWhatsapp && <p>WhatsApp {logistics.clientWhatsapp}</p>}
                {logistics.clientEmail && <p className="truncate">{logistics.clientEmail}</p>}
                {logistics.clientNif && <p>NIF {logistics.clientNif}</p>}
                {logistics.clientMainAddress && <p className="sm:col-span-2">Adresse : {logistics.clientMainAddress}</p>}
                {logistics.clientMainAxis && <p>Axe : {logistics.clientMainAxis}</p>}
                {logistics.clientCommercial && <p>Commercial : {logistics.clientCommercial}</p>}
              </div>
            </div>
          )}

          <div className="orion-surface-group space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Adresse de livraison pour ce devis</p>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={logistics.useClientMainAddress !== false}
                onChange={(e) => toggleUseMainAddress(e.target.checked)}
                className="rounded border-border"
              />
              Utiliser l&apos;adresse principale du client
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Adresse de livraison" required={meta.modeExpedition === 'Livraison client'}>
                <input
                  value={logistics.deliveryAddress ?? ''}
                  onChange={(e) => patchLogistics({ deliveryAddress: e.target.value, useClientMainAddress: false })}
                  className={inputCls}
                  placeholder="Rue, quartier, ville…"
                />
              </Field>
              <Field label="Axe de livraison">
                <select
                  value={logistics.deliveryAxis ?? ''}
                  onChange={(e) => patchLogistics({ deliveryAxis: e.target.value, useClientMainAddress: false })}
                  className={inputCls}
                >
                  <option value="">— Sélectionner —</option>
                  {LIVRAISON_AXES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Repère / quartier / ville">
                <input
                  value={logistics.deliveryLandmark ?? ''}
                  onChange={(e) => patchLogistics({ deliveryLandmark: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Détails livraison">
                <input
                  value={logistics.deliveryDetails ?? ''}
                  onChange={(e) => patchLogistics({ deliveryDetails: e.target.value })}
                  placeholder="Étage, contact sur place…"
                  className={inputCls}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={!!logistics.saveAddressToClient}
                onChange={(e) => patchLogistics({ saveAddressToClient: e.target.checked })}
                className="rounded border-border"
              />
              Enregistrer cette adresse aussi dans la fiche client
            </label>
          </div>

          {hasLogisticsAlerts && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 flex gap-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Champs obligatoires à compléter</p>
                <p className="mt-0.5 text-amber-700/90 dark:text-amber-100/90">
                  {[
                    logisticsMissing.expedition && 'Mode d\'expédition',
                    logisticsMissing.dateLiv && 'Date de livraison',
                    logisticsMissing.delai && 'Délai d\'exécution',
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Expédition" required alert={logisticsMissing.expedition} accent="amber">
              <select
                value={meta.modeExpedition ?? ''}
                onChange={(e) => patchMeta({ modeExpedition: e.target.value })}
                className={requiredInputCls(logisticsMissing.expedition, 'amber')}
              >
                <option value="">— Choisir l&apos;expédition —</option>
                {EXPEDITION_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
            {meta.modeExpedition === 'Autre' && (
              <Field label="Préciser le mode d'expédition" required>
                <input value={meta.expeditionOther ?? ''} onChange={(e) => patchMeta({ expeditionOther: e.target.value })} className={inputCls} />
              </Field>
            )}
            <Field label="Détails expédition" className="sm:col-span-2">
              <input
                value={meta.expeditionDetails ?? ''}
                onChange={(e) => patchMeta({ expeditionDetails: e.target.value })}
                placeholder="Ex. à livrer avant 10h, appeler le client avant départ."
                className={inputCls}
              />
            </Field>
            <Field label="Date de livraison" required alert={logisticsMissing.dateLiv} accent="rose">
              <input
                type="date"
                value={meta.dateLivraison?.slice(0, 10) ?? ''}
                onChange={(e) => patchMeta({ dateLivraison: e.target.value })}
                className={requiredInputCls(logisticsMissing.dateLiv, 'rose')}
              />
            </Field>
            <Field label="Délai d'exécution" required alert={logisticsMissing.delai} accent="violet">
              <select
                value={meta.delaiExecution ?? ''}
                onChange={(e) => patchMeta({ delaiExecution: e.target.value })}
                className={requiredInputCls(logisticsMissing.delai, 'violet')}
              >
                <option value="">— Sélectionner —</option>
                {DELAI_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
            {meta.delaiExecution === 'Autre' && (
              <Field label="Préciser le délai" required>
                <input value={meta.executionDelayOther ?? ''} onChange={(e) => patchMeta({ executionDelayOther: e.target.value })} className={inputCls} />
              </Field>
            )}
            <Field label="Priorité">
              <select value={meta.priorite ?? 'Normale'} onChange={(e) => patchMeta({ priorite: e.target.value as DevisValidationMeta['priorite'] })} className={inputCls}>
                {PRIORITE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Informations sur le délai" className="sm:col-span-2">
              <textarea
                value={[meta.delaiDetails, meta.prioriteDetails].filter(Boolean).join('\n') || ''}
                onChange={(e) => {
                  const text = e.target.value;
                  patchMeta({
                    delaiDetails: text,
                    prioriteDetails: text.trim() ? text : (meta.prioriteDetails ?? ''),
                  });
                }}
                rows={3}
                placeholder="Conditions et contraintes de délai : production après validation BAT, client part le…, priorité urgente…"
                className={inputCls}
              />
            </Field>
          </div>

          {logisticsRecap.length > 0 && (
            <div className="orion-surface-context p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Synthèse logistique</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {logisticsRecap.map((r) => (
                  <span key={r.label}><span className="text-muted-foreground">{r.label} :</span> <strong>{r.value}</strong></span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ——— PAIEMENT & VALIDATION ——— */}
      <section className="orion-surface-card-soft overflow-hidden h-full">
        <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--bg-chip)]">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-primary" />
            <h3 className="text-sm font-bold">Paiement & validation</h3>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Bloc A — Mode */}
          <Block title="Mode de paiement" icon={<Wallet size={14} />}>
            <div className="flex flex-wrap gap-2">
              {(['Especes', 'Cheque', 'MobileMoney', 'Virement'] as PaymentMode[]).map((mode) => (
                <ChipButton
                  key={mode}
                  active={meta.paymentMode === mode}
                  onClick={() => patchMeta({ paymentMode: mode })}
                  label={mode === 'Especes' ? 'Espèces' : mode === 'Cheque' ? 'Chèque' : mode === 'Virement' ? 'Virement bancaire' : 'Mobile Money'}
                />
              ))}
            </div>
          </Block>

          {/* Bloc B — Détails paiement */}
          <Block title="Détails du paiement">
            {meta.paymentMode === 'MobileMoney' && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Opérateur</p>
                <div className="flex flex-wrap gap-2">
                  {(['Mvola', 'Airtel Money', 'Orange Money'] as MobileMoneyProvider[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => patchMeta({ mobileMoneyProvider: p })}
                      className={`px-3 py-2 rounded-[7px] text-xs font-bold border transition-all ${
                        meta.mobileMoneyProvider === p ? MM_STYLES[p].active : MM_STYLES[p].idle
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(meta.paymentMode === 'Cheque' || meta.paymentMode === 'MobileMoney' || meta.paymentMode === 'Virement') && (
              <Field label={meta.paymentMode === 'Cheque' ? 'Référence chèque *' : meta.paymentMode === 'Virement' ? 'Référence / n° virement *' : 'Référence Mobile Money *'}>
                <input value={meta.referencePaiement ?? ''} onChange={(e) => patchMeta({ referencePaiement: e.target.value })} className={inputCls} />
              </Field>
            )}
            {meta.paymentMode === 'Virement' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Banque *">
                  <input value={meta.bankName ?? ''} onChange={(e) => patchMeta({ bankName: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Date de virement">
                  <input type="date" value={meta.transferDate?.slice(0, 10) ?? ''} onChange={(e) => patchMeta({ transferDate: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Titulaire / émetteur">
                  <input value={meta.payerName ?? ''} onChange={(e) => patchMeta({ payerName: e.target.value })} className={inputCls} />
                </Field>
              </div>
            )}
            <Field label="Heure de paiement *">
              <input type="time" value={meta.paymentTime ?? ''} onChange={(e) => patchMeta({ paymentTime: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Note paiement">
              <input value={meta.paymentNote ?? ''} onChange={(e) => patchMeta({ paymentNote: e.target.value })} placeholder="Facultatif" className={inputCls} />
            </Field>
          </Block>

          {/* Bloc D — Montant */}
          <Block title="Montant encaissé">
            <div className="flex flex-wrap gap-2">
              {([['acompte50', 'Acompte 50 %'], ['custom', 'Montant personnalisé'], ['total', 'Totalité']] as [PaymentChip, string][]).map(([chip, label]) => (
                <ChipButton
                  key={chip}
                  active={meta.paymentChip === chip}
                  onClick={() => patchMeta({ paymentChip: chip })}
                  label={label}
                  accent
                />
              ))}
            </div>
            {meta.paymentChip === 'acompte50' && (
              <p className="text-xs text-muted-foreground mt-2">Montant calculé : <strong className="font-mono">{formatPrice(Math.round(totalTTC * 0.5))} Ar</strong></p>
            )}
            {meta.paymentChip === 'custom' && (
              <input type="number" min={0} max={totalTTC} value={customMontant} onChange={(e) => setCustomMontant(e.target.value)} placeholder="Montant payé (Ar)" className={`mt-2 ${inputCls}`} />
            )}
          </Block>

          {/* Bloc E — Résumé */}
          <div className={`orion-surface-context p-4 space-y-2 ${(enriched.resteAPayer ?? 0) === 0 ? 'border-[color-mix(in_srgb,var(--success)_35%,var(--border-soft))]' : ''}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Résumé financier</p>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total TTC</span><span className="font-mono font-semibold">{formatPrice(totalTTC)} Ar</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Montant payé</span><span className="font-mono font-semibold text-emerald-600">{formatPrice(enriched.montantPaye ?? 0)} Ar</span></div>
            <div className="flex justify-between pt-2 border-t border-border font-bold">
              <span>{(enriched.resteAPayer ?? 0) === 0 ? 'Soldé' : 'Reste à payer'}</span>
              <span className={`font-mono text-lg ${(enriched.resteAPayer ?? 0) === 0 ? 'text-emerald-600' : 'text-[var(--orion-red-vivid)]'}`}>
                {formatPrice(enriched.resteAPayer ?? 0)} Ar
              </span>
            </div>
          </div>

          {!clientEmail && (
            <p className="text-xs text-amber-600">Aucun email renseigné pour ce client — l&apos;envoi email sera indisponible.</p>
          )}

          {/* Bloc F — Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <AppButton type="button" variant="outline" onClick={handleSave} disabled={saving || validating}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Enregistrer
            </AppButton>
            {canValidate && (
              <AppButton type="button" onClick={handleValidateCommande} disabled={saving || validating} className="font-bold shadow-md">
                {validating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Valider commande
              </AppButton>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const inputCls = 'w-full bg-[var(--bg-card-soft)] border border-[var(--border-soft)] rounded-[7px] px-3 py-2 text-sm outline-none focus:bg-[var(--bg-card)] focus:border-[var(--border-active-soft)] focus:ring-2 focus:ring-primary/20';

type RequiredAccent = 'amber' | 'rose' | 'violet';

function requiredInputCls(missing: boolean, accent: RequiredAccent): string {
  if (!missing) return inputCls;
  const accents: Record<RequiredAccent, string> = {
    amber: 'border-amber-500/80 bg-amber-500/10 ring-2 ring-amber-500/25 focus:ring-amber-500/40',
    rose: 'border-[color-mix(in_srgb,var(--primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--primary)_25%,transparent)] focus:ring-[color-mix(in_srgb,var(--primary)_40%,transparent)]',
    violet: 'border-violet-500/80 bg-violet-500/10 ring-2 ring-violet-500/25 focus:ring-violet-500/40',
  };
  return `w-full rounded-[7px] px-3 py-2 text-sm outline-none ${accents[accent]}`;
}

function Field({
  label,
  children,
  required,
  alert,
  accent,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  alert?: boolean;
  accent?: RequiredAccent;
  className?: string;
}) {
  const accentColors: Record<RequiredAccent, string> = {
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-[var(--primary)]',
    violet: 'text-violet-600 dark:text-violet-400',
  };
  return (
    <label className={`block space-y-1 ${className ?? ''}`}>
      <span className={`text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1 ${alert && accent ? accentColors[accent] : 'text-muted-foreground'}`}>
        {alert ? <AlertTriangle size={11} className="shrink-0" /> : null}
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function Block({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="orion-surface-group space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon}{title}
      </p>
      {children}
    </div>
  );
}

function ChipButton({ active, onClick, label, accent }: { active: boolean; onClick: () => void; label: string; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`orion-surface-chip ${active ? 'orion-surface-chip--active' : ''} ${
        active && accent ? 'border-[var(--ans-gold-500)] bg-[color-mix(in_srgb,var(--ans-gold-500)_14%,var(--bg-chip))]' : ''
      }`}
    >
      {label}
    </button>
  );
}
