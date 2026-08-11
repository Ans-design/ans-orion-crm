'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Bell,
  Send,
  AlertTriangle,
  Palette,
  Truck,
  Users,
  Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AppPageHeader,
  AppKpiCard,
  AppButton,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';

type Pending = {
  type: string;
  commandeId: string;
  numero: string;
  client: string;
  message: string;
  dateLiv: string | null;
};
type Client = { id: string; name: string };
type History = {
  id: string;
  type: string;
  canal: string;
  message: string;
  sentAt: string;
  client?: { name: string } | null;
};

const TYPE_ICON: Record<string, LucideIcon> = {
  retard: AlertTriangle,
  bat: Palette,
  livraison: Truck,
};

const TYPE_TONE: Record<string, 'danger' | 'warning' | 'success'> = {
  retard: 'danger',
  bat: 'warning',
  livraison: 'success',
};

export default function CmNotificationsPage() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <CmNotificationsPageInner />
    </Suspense>
  );
}

function CmNotificationsPageInner() {
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [pending, setPending] = useState<Pending[]>([]);
  const [stats, setStats] = useState({ retards: 0, batPending: 0, livrees: 0, clients: 0 });
  const [clients, setClients] = useState<Client[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({ clientId: '', canal: 'WhatsApp', message: '' });
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      fetch('/api/cm/notifications').then(async (r) => {
        if (!r.ok) throw new Error('notif');
        return r.json();
      }),
      fetch('/api/cm/notifications?history=1').then(async (r) => {
        if (!r.ok) return { history: [] };
        return r.json();
      }),
    ])
      .then(([main, hist]) => {
        const m = main as { pending?: Pending[]; stats?: typeof stats; clients?: Client[] };
        setPending(m.pending ?? []);
        setStats((prev) => m.stats ?? prev);
        setClients(m.clients ?? []);
        setHistory((hist as { history?: History[] }).history ?? []);
      })
      .catch(() => {
        setLoadError(true);
        setPending([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const notify = async (item: Pending) => {
    await fetch('/api/cm/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandeId: item.commandeId,
        type: item.type,
        canal: 'WhatsApp',
        message: item.message,
      }),
    });
    load();
  };

  const sendManual = async () => {
    if (!form.message.trim()) return;
    setSending(true);
    try {
      const client = clients.find((c) => c.id === form.clientId);
      await fetch('/api/cm/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId || null,
          clientName: client?.name,
          type: 'manual',
          canal: form.canal,
          message: form.message,
        }),
      });
      setForm({ ...form, message: '' });
      load();
    } finally {
      setSending(false);
    }
  };

  const prefill = (type: string) => {
    const templates: Record<string, string> = {
      bat: 'Bonjour, votre BAT est prêt pour validation. Merci de nous confirmer sous 24h.',
      retard: "Bonjour, nous vous informons d'un léger retard sur votre commande. Nous faisons notre maximum.",
      livraison: 'Bonjour, votre commande est prête ! Vous pouvez passer la récupérer ou planifier la livraison.',
    };
    setForm({ ...form, message: templates[type] ?? '' });
  };

  const visiblePending = useMemo(
    () => (commandeId ? pending.filter((n) => n.commandeId === commandeId) : pending),
    [pending, commandeId],
  );

  return (
    <div className="cm-notif-page dashboard-full">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      {commandeId && (
        <p className="text-xs text-muted-foreground m-0">
          Filtré sur la commande —{' '}
          <Link href={`/commandes/${commandeId}`} className="text-primary font-semibold hover:underline">
            dossier 360° →
          </Link>
          {' · '}
          <Link href={`/cm/campagnes?commande=${commandeId}`} className="text-primary hover:underline">
            Campagnes
          </Link>
          {' · '}
          <Link href={`/cm/relances?commande=${commandeId}`} className="text-primary hover:underline">
            Relances
          </Link>
        </p>
      )}

      <AppPageHeader
        title="Notifications clients"
        description="Alertes · relances · confirmations à envoyer"
        icon={Bell}
      />

      <div className="cm-notif-kpi">
        <AppKpiCard label="Retards" value={stats.retards} icon={AlertTriangle} tone="danger" />
        <AppKpiCard label="BAT en attente" value={stats.batPending} icon={Palette} tone="warning" />
        <AppKpiCard label="Livraisons prêtes" value={stats.livrees} icon={Truck} tone="success" />
        <AppKpiCard label="Clients actifs" value={stats.clients} icon={Users} tone="info" />
      </div>

      <div className="cm-notif-layout">
        <section className="cm-notif-panel">
          <div className="cm-notif-panel__head">
            <h2>
              <Bell size={14} /> À envoyer
            </h2>
            <span className="cm-notif-panel__count">{visiblePending.length}</span>
          </div>

          {loading ? (
            <AppListSkeleton rows={3} />
          ) : loadError ? (
            <AppEmptyState
              icon={Bell}
              title="Chargement impossible"
              description="Réessayez dans un instant."
              action={
                <AppButton type="button" size="sm" onClick={load}>
                  Réessayer
                </AppButton>
              }
            />
          ) : visiblePending.length === 0 ? (
            <AppEmptyState
              icon={Bell}
              title="Rien d’urgent"
              description="Aucune notification en attente pour le moment."
            />
          ) : (
            <div className="cm-notif-queue">
              {visiblePending.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                const tone = TYPE_TONE[n.type] ?? 'info';
                return (
                  <div key={`${n.commandeId}-${n.type}`} className="cm-notif-item" data-type={n.type}>
                    <span className="cm-notif-item__icon" data-type={n.type} aria-hidden>
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    <div className="cm-notif-item__body">
                      <p className="cm-notif-item__msg">{n.message}</p>
                      <span className="cm-notif-item__meta">
                        {n.numero} · {n.client}
                      </span>
                    </div>
                    <div className="cm-notif-item__action">
                      <AppButton
                        type="button"
                        size="sm"
                        variant={tone === 'danger' ? 'destructive' : 'outline'}
                        onClick={() => notify(n)}
                      >
                        <Send size={12} />
                        Notifier
                      </AppButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="cm-notif-panel__head" style={{ marginTop: '0.35rem' }}>
            <h2>Historique · 7 j</h2>
            <span className="cm-notif-panel__count">{history.length}</span>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3 m-0">
              Aucune notification récente
            </p>
          ) : (
            <div className="cm-notif-history">
              {history.map((h) => (
                <div key={h.id} className="cm-notif-hist-item">
                  <div className="cm-notif-hist-item__top">
                    <span>{new Date(h.sentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                    <span>{h.canal}</span>
                  </div>
                  <div className="cm-notif-hist-item__msg">{h.message}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="cm-notif-panel cm-notif-panel--composer">
          <div className="cm-notif-panel__head">
            <h2>
              <Flame size={14} /> Composer
            </h2>
          </div>
          <div className="cm-notif-composer">
            <div className="cm-notif-composer__row">
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                aria-label="Client"
              >
                <option value="">Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={form.canal}
                onChange={(e) => setForm({ ...form, canal: e.target.value })}
                aria-label="Canal"
              >
                {['WhatsApp', 'Email', 'Appel', 'SMS'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={5}
              placeholder="Bonjour [client], votre commande…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              aria-label="Message"
            />
            <div className="cm-notif-templates">
              <button type="button" className="cm-notif-tpl" onClick={() => prefill('bat')}>
                Modèle BAT
              </button>
              <button type="button" className="cm-notif-tpl" onClick={() => prefill('retard')}>
                Modèle retard
              </button>
              <button type="button" className="cm-notif-tpl" onClick={() => prefill('livraison')}>
                Modèle livraison
              </button>
            </div>
            <AppButton type="button" size="sm" disabled={sending || !form.message.trim()} onClick={sendManual}>
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Envoyer
            </AppButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
