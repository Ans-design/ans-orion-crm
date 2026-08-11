'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  MessagesSquare,
  ShieldAlert,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage, unwrapApiData } from '@/lib/api-client';
import { emitCommercialJourney } from '@/lib/commercial/commercial-journey-store';
import { clearCommandeOpsJourney } from '@/lib/commande/commande-ops-journey-store';
import { isCommandeLivreeLabel } from '@/lib/data/commande-statut-display';
import { ORION_NAV_BADGES_REFRESH_EVENT } from '@/lib/navigation/use-nav-badges';
import {
  RETOUR_CLIENT_CATEGORIES,
  buildRetourClientFeedback,
  getRetourClientCategory,
  isRetourClientFeedbackReady,
} from '@/lib/commande/retour-client-issues';

type Props = {
  commandeId: string;
  numero: string;
  clientName?: string | null;
  statut: string;
  onDone?: () => void;
};

export function CommandeFinalizePanel({
  commandeId,
  numero,
  clientName,
  statut,
  onDone,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const mayForce = role === 'admin' || role === 'manager';
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [issueIds, setIssueIds] = useState<string[]>([]);
  const [detail, setDetail] = useState('');
  const [openReclamation, setOpenReclamation] = useState(true);
  const [openTalk, setOpenTalk] = useState(true);
  const [priorite, setPriorite] = useState<'Basse' | 'Normale' | 'Haute' | 'Urgente'>('Normale');
  const [loading, setLoading] = useState(false);
  const alreadyLivree = isCommandeLivreeLabel(statut);

  const category = useMemo(() => getRetourClientCategory(categoryId), [categoryId]);
  const ready = isRetourClientFeedbackReady({ categoryId, issueIds, detail });
  const isSatisfait = categoryId === 'satisfait';

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setIssueIds([]);
    // SAV utile surtout pour les écarts — satisfait peut rester sans réclamation
    if (id === 'satisfait') {
      setOpenReclamation(false);
      setPriorite('Basse');
    } else if (!openReclamation) {
      setOpenReclamation(true);
      setPriorite('Normale');
    }
  };

  const toggleIssue = (id: string) => {
    setIssueIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (force = false) => {
    if (!ready || !categoryId) {
      uxToast.error('Choisissez le poste et le type d’erreur (ou précisez le détail)');
      return;
    }
    const clientFeedback = buildRetourClientFeedback({
      categoryId,
      issueIds,
      detail,
    });
    if (clientFeedback.trim().length < 3) {
      uxToast.error('Indiquez le retour du client');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/commandes/${commandeId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientFeedback,
          openReclamation,
          openTalk,
          priorite,
          force,
          issueCategory: categoryId,
          issueIds,
          assigneeRole: category?.assigneeRole,
        }),
      });
      const raw = await r.json().catch(() => ({}));
      if (!r.ok) {
        uxToast.error(getApiErrorMessage(raw, 'Finalisation impossible'));
        return;
      }
      const data = unwrapApiData<{
        success?: boolean;
        redirectTo?: string;
        talkConversation?: { id: string } | null;
        reclamation?: { id: string } | null;
      }>(raw);

      emitCommercialJourney('manual', {
        lastCommandeId: commandeId,
        preferredStep: openReclamation ? 'reclamations' : 'commandes',
      });
      clearCommandeOpsJourney();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(ORION_NAV_BADGES_REFRESH_EVENT));
      }

      const talkOk = Boolean(data.talkConversation?.id);
      if (openTalk && !talkOk) {
        uxToast.success(
          openReclamation
            ? 'Commande finalisée — SAV ouvert (Talk indisponible)'
            : 'Commande finalisée (Talk indisponible)',
        );
      } else {
        uxToast.success(
          openReclamation
            ? 'Commande finalisée — évaluation SAV ouverte'
            : 'Commande finalisée',
        );
      }
      onDone?.();

      const href =
        typeof data.redirectTo === 'string' && data.redirectTo.length > 0
          ? data.redirectTo
          : `/commandes/${commandeId}`;
      router.push(href);
    } catch {
      uxToast.error('Erreur réseau — finalisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="cmd-finalize" aria-labelledby={`finalize-title-${commandeId}`}>
      <div className="cmd-finalize__head">
        <span className="cmd-finalize__icon-wrap" aria-hidden>
          <CheckCircle2 size={20} />
        </span>
        <div className="min-w-0">
          <p className="cmd-finalize__kicker">
            <Sparkles size={11} aria-hidden /> Étape finale
          </p>
          <h3 id={`finalize-title-${commandeId}`} className="cmd-finalize__title">
            {alreadyLivree ? 'Retour client & clôture SAV' : 'Finaliser la commande'}
          </h3>
          <p className="cmd-finalize__sub">
            <span className="cmd-finalize__meta">{numero}</span>
            {clientName ? (
              <>
                <span className="cmd-finalize__dot" aria-hidden />
                <span>{clientName}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <ol className="cmd-finalize__steps" aria-label="Parcours de clôture">
        <li className="is-active">
          <span>1</span> Retour client
        </li>
        <li className={openReclamation ? 'is-active' : ''}>
          <span>2</span> Réclamations
        </li>
        <li className={openTalk ? 'is-active' : ''}>
          <span>3</span> Talk groupe
        </li>
      </ol>

      <div className="cmd-finalize__field">
        <div className="cmd-finalize__field-top">
          <span className="cmd-finalize__label">
            <MessageSquareText size={14} aria-hidden />
            Poste concerné
          </span>
        </div>
        <div className="cmd-finalize__cat-grid" role="group" aria-label="Poste imprimerie">
          {RETOUR_CLIENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cmd-finalize__cat-chip ${categoryId === cat.id ? 'is-on' : ''} ${cat.id === 'satisfait' ? 'is-ok' : ''}`}
              disabled={loading}
              aria-pressed={categoryId === cat.id}
              onClick={() => selectCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {category ? (
        <div className="cmd-finalize__field">
          <div className="cmd-finalize__field-top">
            <span className="cmd-finalize__label">
              {isSatisfait ? 'Niveau de satisfaction' : 'Type d’erreur'}
            </span>
            <span className="cmd-finalize__notify" title={`Rôle : ${category.assigneeRole}`}>
              <UserRound size={12} aria-hidden />
              À informer · {category.roleLabel}
            </span>
          </div>
          <div className="cmd-finalize__issue-grid" role="group" aria-label="Types d’erreur">
            {category.issues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                className={`cmd-finalize__issue-chip ${issueIds.includes(issue.id) ? 'is-on' : ''}`}
                disabled={loading}
                aria-pressed={issueIds.includes(issue.id)}
                onClick={() => toggleIssue(issue.id)}
              >
                {issue.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="cmd-finalize__hint">
          Sélectionnez le poste (impression, calage, façonnage…) pour cibler l’erreur et la personne qui occupe.
        </p>
      )}

      <div className="cmd-finalize__field">
        <div className="cmd-finalize__field-top">
          <label className="cmd-finalize__label" htmlFor={`retour-${commandeId}`}>
            Précision (optionnel)
          </label>
        </div>
        <textarea
          id={`retour-${commandeId}`}
          className="cmd-finalize__textarea"
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Ex. : rouge trop saturé sur la bâche face A, coin bas gauche…"
          disabled={loading}
        />
      </div>

      <div className="cmd-finalize__toggles" role="group" aria-label="Options de bascule">
        <button
          type="button"
          className={`cmd-finalize__toggle ${openReclamation ? 'is-on' : ''}`}
          aria-pressed={openReclamation}
          disabled={loading}
          onClick={() => setOpenReclamation((v) => !v)}
        >
          <span className="cmd-finalize__toggle-title">Réclamations SAV</span>
          <span className="cmd-finalize__toggle-hint">
            {category ? `Évaluer avec ${category.roleLabel}` : 'Évaluer avec les responsables'}
          </span>
        </button>
        <button
          type="button"
          className={`cmd-finalize__toggle ${openTalk ? 'is-on' : ''}`}
          aria-pressed={openTalk}
          disabled={loading}
          onClick={() => setOpenTalk((v) => !v)}
        >
          <span className="cmd-finalize__toggle-title">ANS Talk</span>
          <span className="cmd-finalize__toggle-hint">Groupe des participants</span>
        </button>
      </div>

      {openReclamation && (
        <div className="cmd-finalize__prio-row">
          <span className="cmd-finalize__prio-label">Priorité SAV</span>
          <div className="cmd-finalize__prio-chips">
            {(['Basse', 'Normale', 'Haute', 'Urgente'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`cmd-finalize__prio-chip ${priorite === p ? 'is-on' : ''} ${p === 'Urgente' ? 'is-urgent' : ''}`}
                disabled={loading}
                onClick={() => setPriorite(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="cmd-finalize__actions">
        <button
          type="button"
          className="cmd-finalize__cta"
          disabled={loading || !ready}
          onClick={() => void submit(false)}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <MessagesSquare size={16} />}
          <span>
            {openReclamation && openTalk
              ? 'Finaliser → SAV & Talk'
              : openReclamation
                ? 'Finaliser → Réclamations'
                : openTalk
                  ? 'Finaliser → Talk'
                  : 'Finaliser la commande'}
          </span>
          <ArrowRight size={15} aria-hidden />
        </button>
        {mayForce && !alreadyLivree && (
          <button
            type="button"
            className="cmd-finalize__force"
            disabled={loading || !ready}
            onClick={() => void submit(true)}
          >
            <ShieldAlert size={14} />
            Forcer
          </button>
        )}
      </div>
    </section>
  );
}
