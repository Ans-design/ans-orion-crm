'use client';

import { useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { LIVRAISON_AXES } from '@/lib/client-charte';
import type { ClientSearchResult } from '@/hooks/use-client-search';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';
import { clientSnapshotFromApi } from '@/lib/sales-flow/sales-client-store';

type Props = {
  onCreated: (client: ClientSearchResult) => void;
  onCancel: () => void;
};

export function QuickClientCreateForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [nif, setNif] = useState('');
  const [adresse, setAdresse] = useState('');
  const [axeLivraison, setAxeLivraison] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      uxToast.error('Le nom client est obligatoire');
      return;
    }
    if (nif.trim() && !/^\d+$/.test(nif.trim())) {
      uxToast.error('NIF : chiffres uniquement');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/clients/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tel: tel.trim() || null,
          email: email.trim() || null,
          nif: nif.trim() || null,
          adresse: adresse.trim() || null,
          axeLivraison: axeLivraison || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        uxToast.error(getApiErrorMessage(body, 'Création impossible'), 'Création impossible');
        return;
      }
      const { client: raw } = unwrapApiData<{ client: Record<string, unknown> }>(body);
      if (!raw || typeof raw.id !== 'string') {
        uxToast.error('Réponse serveur invalide', 'Création impossible');
        return;
      }
      const c = raw as Parameters<typeof clientSnapshotFromApi>[0];
      const snapshot = clientSnapshotFromApi(c);
      onCreated({
        id: c.id,
        code: c.code ?? '',
        name: c.name ?? name.trim(),
        tel: c.tel ?? null,
        email: c.email ?? null,
        nif: c.nif ?? null,
        commercialName: c.commercialName ?? null,
        adressePrincipale: [c.adresse, c.ville].filter(Boolean).join(', ') || null,
        axeLivraison: snapshot.axeLivraison ?? null,
        clientFidele: false,
        nombreCommandes: 0,
        totalInvesti: 0,
      });
      uxToast.success('Client créé et sélectionné');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nom client *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Téléphone</label>
          <input type="tel" value={tel} onChange={(e) => setTel(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">NIF (si besoin)</label>
        <input type="text" inputMode="numeric" value={nif} onChange={(e) => setNif(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Adresse</label>
        <input type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Axe de livraison</label>
        <select value={axeLivraison} onChange={(e) => setAxeLivraison(e.target.value)} className={inputClass}>
          <option value="">— Sélectionner —</option>
          {LIVRAISON_AXES.map((axe) => (
            <option key={axe} value={axe}>{axe}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 rounded-[7px] bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Créer et sélectionner'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-[7px] border border-border text-sm font-semibold hover:bg-muted/50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
