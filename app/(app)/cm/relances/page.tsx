'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Loader2,
  Plus,
  Clock,
  CheckCircle2,
  Mail,
  Phone,
  MessageCircle,
  Facebook,
  Instagram,
  CalendarClock,
  Inbox,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AppButton,
  AppPageHeader,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';
import { RELANCE_CANAUX, RELANCE_STATUTS, RELANCE_TYPES, TEMPLATE_CATEGORIES } from '@/lib/constants/cm';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';

type Template = { id: string; name: string; category: string; subject: string | null; body: string };
type Relance = {
  id: string;
  objet: string;
  type: string;
  canal: string;
  statut: string;
  dueDate: string | null;
  message: string | null;
  client?: { name: string; email: string | null } | null;
  template?: { name: string } | null;
};

const CANAL_ICON: Record<string, LucideIcon> = {
  Email: Mail,
  WhatsApp: MessageCircle,
  Téléphone: Phone,
  Facebook,
  Instagram,
};

function isOverdue(r: Relance) {
  return r.statut === 'Planifiée' && !!r.dueDate && new Date(r.dueDate) < new Date();
}

function formatDue(iso: string | null) {
  if (!iso) return 'Sans échéance';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function CmRelancesPage() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <CmRelancesPageInner />
    </Suspense>
  );
}

function CmRelancesPageInner() {
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [relances, setRelances] = useState<Relance[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filtre, setFiltre] = useState('tous');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ objet: '', type: 'Commercial', canal: 'Email', templateId: '', message: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    const q = filtre !== 'tous' ? `?statut=${encodeURIComponent(filtre)}` : '';
    Promise.all([
      fetch(`/api/cm/relances${q}`).then(async (r) => {
        if (!r.ok) throw new Error('relances');
        return r.json();
      }),
      fetch('/api/cm/relances?templates=1').then(async (r) => {
        if (!r.ok) return [];
        return r.json();
      }),
    ])
      .then(([rels, tpls]) => {
        setRelances(Array.isArray(rels) ? rels : []);
        setTemplates(Array.isArray(tpls) ? tpls : []);
      })
      .catch(() => {
        setLoadError(true);
        setRelances([]);
      })
      .finally(() => setLoading(false));
  }, [filtre]);

  useEffect(() => {
    load();
  }, [load]);

  const applyTemplate = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setForm({ ...form, templateId: id, objet: tpl.subject ?? tpl.name, message: tpl.body });
    else setForm({ ...form, templateId: id });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/cm/relances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objet: form.objet,
          type: form.type,
          canal: form.canal,
          message: form.message || null,
          templateId: form.templateId || null,
          dueDate: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setForm({ objet: '', type: 'Commercial', canal: 'Email', templateId: '', message: '' });
        setShowForm(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const markSent = async (id: string) => {
    await fetch(`/api/cm/relances?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sent' }),
    });
    load();
  };

  const overdue = useMemo(() => relances.filter(isOverdue).length, [relances]);
  const planifiees = useMemo(
    () => relances.filter((r) => r.statut === 'Planifiée').length,
    [relances],
  );
  const envoyees = useMemo(
    () => relances.filter((r) => r.statut === 'Envoyée').length,
    [relances],
  );

  return (
    <div className="cm-relances-page dashboard-full">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      {commandeId && (
        <p className="text-xs text-muted-foreground m-0">
          Relance liée au contexte commande —{' '}
          <Link href={`/commandes/${commandeId}`} className="text-primary font-semibold hover:underline">
            dossier 360° →
          </Link>
        </p>
      )}

      <AppPageHeader
        title="Relances clients"
        description="Templates · devis · factures · prospection"
        icon={Send}
        actions={
          <AppButton type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} />
            {showForm ? 'Fermer' : 'Nouvelle relance'}
          </AppButton>
        }
      />

      <div className="cm-relances-kpi">
        <AppKpiCard label="Planifiées" value={planifiees} icon={CalendarClock} tone="info" />
        <AppKpiCard label="En retard" value={overdue} icon={Clock} tone="warning" />
        <AppKpiCard label="Envoyées" value={envoyees} icon={CheckCircle2} tone="success" />
        <AppKpiCard label="Templates" value={templates.length} icon={Inbox} tone="neutral" />
      </div>

      {overdue > 0 && (
        <div className="cm-relances-alert" role="status">
          <Clock size={14} />
          {overdue} relance{overdue > 1 ? 's' : ''} en retard
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="cm-relances-composer">
          <div className="cm-relances-composer__grid">
            <select
              className="cm-relances-composer__tpl"
              value={form.templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              aria-label="Template"
            >
              <option value="">Template (optionnel)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Objet"
              value={form.objet}
              onChange={(e) => setForm({ ...form, objet: e.target.value })}
              aria-label="Objet"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              aria-label="Type"
            >
              {RELANCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={form.canal}
              onChange={(e) => setForm({ ...form, canal: e.target.value })}
              aria-label="Canal"
            >
              {RELANCE_CANAUX.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={3}
            aria-label="Message"
          />
          <div>
            <AppButton type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Planifier
            </AppButton>
          </div>
        </form>
      )}

      <div className="cm-relances-toolbar">
        <div>
          <h2>
            {relances.length} relance{relances.length > 1 ? 's' : ''}
          </h2>
          <p className="hint">
            {templates.length} template{templates.length > 1 ? 's' : ''} ·{' '}
            {TEMPLATE_CATEGORIES.slice(0, 3).join(', ')}…
          </p>
        </div>
        <div className="cm-relances-filters" role="tablist" aria-label="Filtrer par statut">
          <button
            type="button"
            role="tab"
            aria-selected={filtre === 'tous'}
            className={`cm-relances-filter${filtre === 'tous' ? ' is-active' : ''}`}
            onClick={() => setFiltre('tous')}
          >
            Toutes
          </button>
          {RELANCE_STATUTS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={filtre === s}
              className={`cm-relances-filter${filtre === s ? ' is-active' : ''}`}
              onClick={() => setFiltre(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <AppListSkeleton rows={4} />
      ) : loadError ? (
        <AppEmptyState
          icon={Send}
          title="Chargement impossible"
          description="Réessayez ou vérifiez la connexion API."
          action={
            <AppButton type="button" size="sm" onClick={load}>
              Réessayer
            </AppButton>
          }
        />
      ) : relances.length === 0 ? (
        <AppEmptyState
          icon={Send}
          title="Aucune relance"
          description="Planifiez une relance devis, facture ou prospection."
          action={
            <AppButton type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Nouvelle relance
            </AppButton>
          }
        />
      ) : (
        <div className="cm-relances-grid">
          {relances.map((r) => {
            const overdueItem = isOverdue(r);
            const CanalIcon = CANAL_ICON[r.canal] ?? Mail;
            return (
              <article
                key={r.id}
                className={`cm-relance-card${overdueItem ? ' is-overdue' : ''}`}
                data-statut={r.statut}
              >
                <div className="cm-relance-card__top">
                  <span className="cm-relance-card__icon" data-canal={r.canal} aria-hidden>
                    <CanalIcon size={15} strokeWidth={2} />
                  </span>
                  <div className="cm-relance-card__main">
                    <div className="cm-relance-card__client">{r.client?.name ?? 'Client —'}</div>
                    <h3 className="cm-relance-card__objet">{r.objet}</h3>
                    <div className="cm-relance-card__chips">
                      <span className="cm-relance-pill" data-statut={r.statut}>
                        {r.statut}
                      </span>
                      <span className="cm-relance-pill cm-relance-pill--canal">{r.canal}</span>
                      <span className="cm-relance-pill cm-relance-pill--type">{r.type}</span>
                      {overdueItem ? (
                        <span className="cm-relance-pill cm-relance-pill--overdue">Retard</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="cm-relance-card__foot">
                  <span className={`cm-relance-card__due${overdueItem ? ' is-overdue' : ''}`}>
                    {formatDue(r.dueDate)}
                  </span>
                  {r.statut === 'Planifiée' ? (
                    <button
                      type="button"
                      className="cm-relance-send"
                      onClick={() => markSent(r.id)}
                    >
                      <CheckCircle2 size={12} />
                      Envoyée
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
