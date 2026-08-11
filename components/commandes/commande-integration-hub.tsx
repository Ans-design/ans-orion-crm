'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';
import {
  MessageSquare, FileCheck, Banknote,
  FileImage, RefreshCw, FileText, ClipboardCheck, Calendar, ShoppingCart,
  Megaphone, Send, Package,
} from 'lucide-react';
import {
  batStatusLabel,
  stockStatusLabel,
  productionStatusLabel,
  livraisonStatusLabel,
  factureStatusLabel,
} from '@/lib/commande/order-status-labels';
import { buildCommandeUniverseFlowSteps } from '@/lib/commande/commande-universe-flow';
import { syncCommandeOpsJourney } from '@/lib/commande/commande-ops-journey-store';

type Props = {
  commandeId: string;
  statut: string;
  reste: number;
  talkConversation?: { id: string; name: string } | null;
  summary: {
    totalBAT?: number;
    batValides?: number;
    dossiersProduction?: number;
    livraisons?: number;
    factures?: number;
    fichiers?: number;
    stockReservations?: number;
  };
  avancement?: number;
  devisId?: string | null;
  dossierId?: string | null;
  onTalkCreated?: () => void;
};

const LINK = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold border border-border/60 hover:bg-accent transition';
const STATUS = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold border';

function HubRow({ label, status, href, action }: {
  label: string;
  status: { label: string; tone: 'muted' | 'warn' | 'ok' };
  href: string;
  action?: React.ReactNode;
}) {
  const toneClass = {
    muted: 'border-border/60 text-muted-foreground',
    warn: 'border-amber-500/40 text-amber-700 bg-amber-500/5',
    ok: 'border-emerald-500/40 text-emerald-700 bg-emerald-500/5',
  }[status.tone];

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className="text-[10px] font-medium text-muted-foreground w-20 shrink-0">{label}</span>
      <span className={`${STATUS} ${toneClass}`}>{status.label}</span>
      {action ?? (
        <Link href={href} className={LINK}>Ouvrir →</Link>
      )}
    </div>
  );
}

function UniverseFlowStrip({
  commandeId,
  statut,
  reste,
  devisId,
  talkConversationId,
  hasBatPending,
  hasDossierGpaO,
  hasLivraison,
  hasFacture,
}: {
  commandeId: string;
  statut: string;
  reste: number;
  devisId?: string | null;
  talkConversationId?: string | null;
  hasBatPending: boolean;
  hasDossierGpaO: boolean;
  hasLivraison: boolean;
  hasFacture: boolean;
}) {
  const steps = buildCommandeUniverseFlowSteps({
    commandeId,
    statut,
    reste,
    devisId,
    talkConversationId,
    hasBatPending,
    hasDossierGpaO,
    hasLivraison,
    hasFacture,
  });

  return (
    <nav
      aria-label="Parcours univers métier"
      className="flex flex-wrap items-center gap-1 pb-2 mb-1 border-b border-border/50"
    >
      {steps.map((step, i) => (
        <span key={step.id} className="inline-flex items-center gap-1">
          {i > 0 && (
            <span className="text-[9px] text-muted-foreground/70 px-0.5" aria-hidden>
              →
            </span>
          )}
          <Link
            href={step.href}
            className={[
              'px-2 py-1 rounded-md text-[10px] font-semibold border transition',
              step.state === 'active'
                ? 'border-primary/50 bg-primary/10 text-primary'
                : step.state === 'done'
                  ? 'border-emerald-500/30 text-emerald-700 bg-emerald-500/5'
                  : 'border-border/50 text-muted-foreground hover:bg-accent',
            ].join(' ')}
            aria-current={step.state === 'active' ? 'step' : undefined}
            title={step.label}
          >
            {step.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

export function CommandeIntegrationHub({
  commandeId, statut, reste, talkConversation, summary, devisId, onTalkCreated, avancement = 0,
}: Props) {
  const [creatingTalk, setCreatingTalk] = useState(false);

  const bat = batStatusLabel(summary.totalBAT ?? 0, summary.batValides ?? 0);
  const prod = productionStatusLabel(summary.dossiersProduction ?? 0, avancement);
  const liv = livraisonStatusLabel(summary.livraisons ?? 0, statut);
  const fac = factureStatusLabel(summary.factures ?? 0, statut, reste);
  const stk = stockStatusLabel(summary.stockReservations ?? 0, statut);

  const hasBatPending =
    (summary.totalBAT ?? 0) > 0 && (summary.batValides ?? 0) < (summary.totalBAT ?? 0);
  const hasDossierGpaO = (summary.dossiersProduction ?? 0) > 0;
  const hasLivraison = (summary.livraisons ?? 0) > 0;
  const hasFacture = (summary.factures ?? 0) > 0;

  useEffect(() => {
    syncCommandeOpsJourney({
      commandeId,
      statut,
      reste,
      devisId,
      talkConversationId: talkConversation?.id,
      hasBatPending,
      hasDossierGpaO,
      hasLivraison,
      hasFacture,
      avancement,
    });
  }, [
    commandeId,
    statut,
    reste,
    devisId,
    talkConversation?.id,
    hasBatPending,
    hasDossierGpaO,
    hasLivraison,
    hasFacture,
    avancement,
  ]);

  const createTalk = async () => {
    setCreatingTalk(true);
    try {
      const r = await fetch('/api/messaging/conversations/create-from-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commandeId }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Création groupe impossible'));
        return;
      }
      const conv = unwrapApiData<{ id: string }>(await r.json());
      if (!conv?.id) {
        uxToast.error('Réponse conversation invalide');
        return;
      }
      uxToast.success('Groupe ANS Talk créé');
      onTalkCreated?.();
      window.location.href = `/messagerie?conv=${conv.id}`;
    } finally {
      setCreatingTalk(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Parcours commande
      </h3>

      <UniverseFlowStrip
        commandeId={commandeId}
        statut={statut}
        reste={reste}
        devisId={devisId}
        talkConversationId={talkConversation?.id}
        hasBatPending={hasBatPending}
        hasDossierGpaO={hasDossierGpaO}
        hasLivraison={hasLivraison}
        hasFacture={hasFacture}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
        <HubRow label="Commercial" status={{ label: devisId ? 'Devis lié' : '—', tone: devisId ? 'ok' : 'muted' }} href={devisId ? `/devis?id=${devisId}` : '/devis'} />
        <HubRow label="Stock" status={stk} href={`/stock?commande=${commandeId}`} />
        <HubRow label="BAT" status={bat} href={`/commandes/${commandeId}?tab=bat`} />
        <HubRow label="Production" status={prod} href={`/production/dossiers?commande=${commandeId}`} />
        <HubRow label="Livraison" status={liv} href={`/livraisons?commande=${commandeId}`} />
        <HubRow label="Facture" status={fac} href={`/factures?commande=${commandeId}`} />
      </div>

      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
        {devisId && <Link href={`/devis?id=${devisId}`} className={LINK}><FileText size={11} /> Devis</Link>}
        <Link href={`/pos?commande=${commandeId}`} className={LINK}><ShoppingCart size={11} /> POS / reconfig</Link>
        <Link href={`/paiements?commande=${commandeId}`} className={LINK}><Banknote size={11} /> Paiements</Link>
        <Link href={`/planning?commande=${commandeId}`} className={LINK}><Calendar size={11} /> Planning</Link>
        <Link href={`/production/qualite?commande=${commandeId}`} className={LINK}><ClipboardCheck size={11} /> Qualité</Link>
        <Link href={`/commandes/${commandeId}?tab=bat`} className={LINK}><FileImage size={11} /> Fichiers</Link>
        <Link href={`/studio?commande=${commandeId}`} className={LINK}><FileImage size={11} /> Studio</Link>
        <Link href={`/cm/notifications?commande=${commandeId}`} className={LINK}><Megaphone size={11} /> CM notifs</Link>
        <Link href={`/cm/relances?commande=${commandeId}`} className={LINK}><Send size={11} /> CM relances</Link>
        <Link href={`/production/dechets?commande=${commandeId}`} className={LINK}><Package size={11} /> Plan matière</Link>
        <Link href={`/stock?tab=inventaire`} className={LINK}><ClipboardCheck size={11} /> Inventaire</Link>
        {talkConversation ? (
          <Link href={`/messagerie?conv=${talkConversation.id}`} className={LINK}><MessageSquare size={11} className="text-primary" /> Talk</Link>
        ) : (
          <button type="button" onClick={createTalk} disabled={creatingTalk} className={LINK}>
            {creatingTalk ? <RefreshCw size={11} className="animate-spin" /> : <MessageSquare size={11} />} Talk
          </button>
        )}
        <Link href={`/historique?commande=${commandeId}`} className={LINK}><FileCheck size={11} /> Historique</Link>
      </div>
    </div>
  );
}
