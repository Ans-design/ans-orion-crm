'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ExternalLink } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { OrionPanelDrawer } from '@/components/ui/orion-panel-drawer';
import { BatDrawerContent } from '@/components/bat/bat-drawer-content';
import { formatPrice } from '@/lib/data/catalogue';
import { computePaidTotal } from '@/lib/finance/payment-totals';
import { unwrapApiData } from '@/lib/api-client';

export type OrionDrawerEntity = 'client' | 'commande' | 'machine' | 'stock' | 'employe' | 'bat' | 'facture' | 'livraison';

type DrawerState = { type: OrionDrawerEntity; id: string } | null;

type Ctx = {
  openDrawer: (type: OrionDrawerEntity, id: string) => void;
  closeDrawer: () => void;
};

const OrionDrawerContext = createContext<Ctx | null>(null);

export function useOrionDrawer() {
  const ctx = useContext(OrionDrawerContext);
  if (!ctx) throw new Error('useOrionDrawer requires OrionDrawerProvider');
  return ctx;
}

function DrawerBody({ state }: { state: DrawerState }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state) { setData(null); return; }
    setLoading(true);
    const urls: Record<OrionDrawerEntity, string> = {
      client: `/api/clients/${state.id}`,
      commande: `/api/commandes/${state.id}`,
      machine: `/api/machines/${state.id}`,
      stock: `/api/stock/${state.id}`,
      employe: `/api/rh/employes/${state.id}`,
      bat: `/api/proofs/${state.id}`,
      facture: `/api/factures/${state.id}`,
      livraison: `/api/livraisons/${state.id}`,
    };
    fetch(urls[state.type])
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body) {
          setData(null);
          return;
        }
        const payload = unwrapApiData<Record<string, unknown>>(body);
        setData(payload && typeof payload === 'object' ? payload : null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [state]);

  if (!state) return null;

  if (state.type === 'bat') {
    return <BatDrawerContent proofId={state.id} />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[var(--text-muted)]" size={28} />
      </div>
    );
  }
  if (!data) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-12">Données indisponibles.</p>;
  }

  if (state.type === 'client') {
    const c = data as { name?: string; code?: string; statut?: string; email?: string; tel?: string; type?: string; summary?: { totalFacture?: number; commandesCount?: number; solde?: number } };
    return (
      <div className="space-y-4">
        <div className="orion-card p-4 space-y-2">
          <p className="font-mono text-xs text-[var(--orion-red-vivid)]">{c.code}</p>
          <p className="text-sm text-[var(--text-secondary)]">{c.statut} · {c.type}</p>
          {c.email && <p className="text-xs text-[var(--text-muted)]">{c.email}</p>}
          {c.tel && <p className="text-xs text-[var(--text-muted)]">{c.tel}</p>}
        </div>
        {c.summary && (
          <div className="grid grid-cols-2 gap-2">
            <div className="orion-card p-3">
              <p className="text-[9px] uppercase text-[var(--text-muted)] font-bold">Facturé</p>
              <p className="font-mono font-bold text-[var(--text-primary)]">{formatPrice(c.summary.totalFacture ?? 0)}</p>
            </div>
            <div className="orion-card p-3">
              <p className="text-[9px] uppercase text-[var(--text-muted)] font-bold">Commandes</p>
              <p className="font-mono font-bold text-[var(--text-primary)]">{c.summary.commandesCount ?? 0}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (state.type === 'machine') {
    const m = data as { name?: string; code?: string; statut?: string; type?: string; site?: string; rendement?: number };
    return (
      <div className="orion-card p-4 space-y-2">
        <p className="font-mono text-xs text-[var(--text-muted)]">{m.code}</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">{m.name}</p>
        <p className="text-sm text-[var(--text-secondary)]">{m.type} · Site {m.site}</p>
        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ans-btn-primary">{m.statut}</span>
        {m.rendement != null && <p className="text-xs text-emerald-500 mt-2">Rendement {m.rendement} f/h</p>}
      </div>
    );
  }

  if (state.type === 'stock') {
    const s = data as { sku?: string; label?: string; quantity?: number; minQty?: number; reservedQty?: number; unit?: string; category?: string };
    const dispo = (s.quantity ?? 0) - (s.reservedQty ?? 0);
    return (
      <div className="space-y-3">
        <div className="orion-card p-4">
          <p className="font-mono text-xs text-[var(--text-muted)]">{s.sku}</p>
          <p className="font-bold text-[var(--text-primary)]">{s.label}</p>
          <p className="text-xs text-[var(--text-muted)]">{s.category}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="orion-card p-2">
            <p className="text-[9px] text-[var(--text-muted)] uppercase">Stock</p>
            <p className="font-mono font-bold text-[var(--text-primary)]">{Math.floor(s.quantity ?? 0)}</p>
          </div>
          <div className="orion-card p-2">
            <p className="text-[9px] text-[var(--text-muted)] uppercase">Réservé</p>
            <p className="font-mono font-bold text-amber-500">{Math.floor(s.reservedQty ?? 0)}</p>
          </div>
          <div className="orion-card p-2">
            <p className="text-[9px] text-[var(--text-muted)] uppercase">Dispo</p>
            <p className="font-mono font-bold text-emerald-500">{Math.floor(dispo)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.type === 'employe') {
    const e = data as { matricule?: string; firstName?: string; lastName?: string; poste?: string; departement?: string; presenceStatut?: string };
    return (
      <div className="orion-card p-4 space-y-2">
        <p className="font-mono text-xs text-[var(--text-muted)]">{e.matricule}</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">{e.firstName} {e.lastName}</p>
        <p className="text-sm text-[var(--text-secondary)]">{e.poste} · {e.departement}</p>
        <span className="text-[10px] font-bold text-emerald-500">{e.presenceStatut}</span>
      </div>
    );
  }

  if (state.type === 'facture') {
    const f = data as {
      id?: string;
      numero?: string;
      statut?: string;
      totalTTC?: number;
      commandeId?: string;
      client?: { name?: string };
      commande?: { numero?: string; id?: string };
    };
    const paid = computePaidTotal(
      ((data as { paiements?: { montant: number; type?: string }[] }).paiements ?? []),
    );
    const commandeId = f.commandeId ?? f.commande?.id;
    return (
      <div className="space-y-3">
        <div className="orion-card p-4">
          <p className="font-mono text-xs text-[var(--orion-red-vivid)]">{f.numero}</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-1">{f.client?.name ?? '—'}</p>
          <span className="text-[10px] font-bold text-[var(--text-secondary)]">{f.statut}</span>
          <p className="font-mono text-sm text-[var(--orion-yellow)] mt-2">{formatPrice(f.totalTTC ?? 0)}</p>
          <p className="text-xs text-emerald-500 mt-1">Encaissé {formatPrice(paid)}</p>
          {commandeId && (
            <a
              href={`/commandes/${commandeId}?tab=finance`}
              className="inline-block mt-3 text-xs font-semibold text-[var(--orion-red-vivid)] hover:underline"
            >
              Ouvrir dossier commande {f.commande?.numero ? `(${f.commande.numero})` : ''}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (state.type === 'livraison') {
    const l = data as { numero?: string; statut?: string; livreur?: string | null; datePrevue?: string | null; client?: { name?: string }; commande?: { numero?: string } };
    return (
      <div className="orion-card p-4 space-y-2">
        <p className="font-mono text-xs text-[var(--orion-red-vivid)]">{l.numero}</p>
        <p className="text-sm font-bold text-[var(--text-primary)]">{l.client?.name ?? '—'}</p>
        <p className="text-xs text-[var(--text-muted)]">Commande {l.commande?.numero ?? '—'}</p>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--orion-surface-soft)] text-[var(--text-secondary)] border border-[var(--border-subtle)] inline-block">{l.statut}</span>
        {l.livreur && <p className="text-xs text-[var(--text-muted)]">Livreur : {l.livreur}</p>}
        {l.datePrevue && (
          <p className="text-xs text-[var(--text-muted)]">Prévu {new Date(l.datePrevue).toLocaleDateString('fr-FR')}</p>
        )}
      </div>
    );
  }

  return null;
}

const FULL_ROUTES: Record<OrionDrawerEntity, (id: string) => string> = {
  client: (id) => `/clients/${id}`,
  commande: (id) => `/commandes/${id}`,
  machine: (id) => `/machines`,
  stock: (id) => `/stock?id=${id}`,
  employe: (id) => `/rh/employes/${id}`,
  bat: (id) => `/bat?id=${id}`,
  facture: (id) => `/factures?id=${id}`,
  livraison: (id) => `/livraisons?id=${id}`,
};

export function OrionDrawerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<DrawerState>(null);
  const [title, setTitle] = useState('Détail');

  const closeDrawer = useCallback(() => setState(null), []);

  const openDrawer = useCallback((type: OrionDrawerEntity, id: string) => {
    if (type === 'commande') {
      router.push(`/commandes/${id}`);
      return;
    }
    setState({ type, id });
    const labels: Record<OrionDrawerEntity, string> = {
      client: 'Fiche client',
      commande: 'Commande 360°',
      machine: 'Machine',
      stock: 'Article stock',
      employe: 'Employé',
      bat: 'Bon à tirer',
      facture: 'Facture',
      livraison: 'Livraison',
    };
    setTitle(labels[type]);
  }, [router]);

  const openFull = () => {
    if (!state) return;
    router.push(FULL_ROUTES[state.type](state.id));
    closeDrawer();
  };

  return (
    <OrionDrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}
      <OrionPanelDrawer
        open={!!state}
        onClose={closeDrawer}
        title={title}
        subtitle={state ? state.type.toUpperCase() : undefined}
        footer={state ? (
          <>
            <AppButton type="button" variant="outline" className="flex-1" onClick={closeDrawer}>
              Fermer
            </AppButton>
            <button type="button" onClick={openFull} className="flex-1 py-2.5 rounded-md ans-btn-primary text-xs font-bold flex items-center justify-center gap-1.5">
              <ExternalLink size={14} /> Ouvrir la fiche
            </button>
          </>
        ) : undefined}
      >
        <DrawerBody state={state} />
      </OrionPanelDrawer>
    </OrionDrawerContext.Provider>
  );
}
