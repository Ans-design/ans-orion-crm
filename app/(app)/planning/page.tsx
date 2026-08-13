'use client';

/**
 * Planificateur Gantt — étapes Production & Flux, commandes réelles,
 * DnD positionné (étape + heure), assignation opérateur.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  Users,
} from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapListItems, unwrapApiData, getApiErrorMessage } from '@/lib/api-client';
import {
  AppButton,
  AppEmptyState,
  AppFormModal,
  AppFormModalFooter,
} from '@/components/ui/app-ui';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import {
  ProductionGantt,
  type GanttSlot,
  type GanttExternalDrop,
  type GanttShiftMode,
} from '@/components/planning/production-gantt';
import {
  PlanningSlotDetailModal,
  buildSlotTimesFromEdit,
  isoToTimeInput,
} from '@/components/planning/planning-slot-detail-modal';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import { cn } from '@/lib/utils';
import { computeCommandeAvancementFromTasks } from '@/lib/commande/commande-task-avancement';
import {
  PLANNING_SURFACE,
  PLANNING_SURFACE_SOFT,
  planningFocusTint,
  planningGradientForCommande,
  planningPoolCardTint,
  resolveGanttSlotProgress,
} from '@/lib/planning/planning-ui';
import {
  cappedEndIso,
  estimateCommandeMinutes,
  formatDurationFr,
  hoursFromMinutes,
  isActivePlanningStatut,
  isInCommandePool,
  joinOperatorNames,
  maxRemainingAcrossEtapes,
  remainingForEtape,
  splitOperatorNames,
  PLANNING_MIN_SLOT_MIN,
} from '@/lib/planning/planning-pool';

const PLANNING_FOCUS_KEY = 'orion-planning-focus-cmd';

type Slot = GanttSlot;
type Commande = {
  id: string;
  numero: string;
  client?: { name: string; phone?: string | null; email?: string | null };
  article: string;
  statut: string;
  priorite: string;
  total?: number;
  reste?: number;
  devis?: { numero: string } | null;
  avancement?: number;
  livraisonStatut?: string | null;
};

type FluxEtape = {
  id: string;
  name: string;
  code: string;
  responsibleRole: string;
  targetDelayHours: number;
};

type Operator = { id: string; name: string; role: string };

const STATUT_CLS: Record<string, string> = {
  Planifié: 'text-slate-600 dark:text-slate-300',
  'En cours': 'text-yellow-600',
  Terminé: 'text-green-600',
  Terminée: 'text-green-600',
  Annulé: 'text-gray-500',
};

const SLOT_STATUTS = ['Planifié', 'En cours', 'Terminé', 'Annulé'] as const;

function fmtDay(d: Date) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function sameDayLocal(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function normalizeSlotStatut(s: string): (typeof SLOT_STATUTS)[number] {
  if (s === 'Terminée' || s === 'Terminé') return 'Terminé';
  if (s === 'En attente') return 'Planifié';
  if ((SLOT_STATUTS as readonly string[]).includes(s)) return s as (typeof SLOT_STATUTS)[number];
  return 'Planifié';
}

function logistiqueLabel(cmd: Commande): string {
  if (cmd.livraisonStatut) return cmd.livraisonStatut;
  const s = (cmd.statut || '').toLowerCase();
  if (s.includes('livré') || s.includes('livre')) return 'Livrée';
  if (s.includes('expédi') || s.includes('expedi')) return 'En livraison';
  if (s.includes('prêt') || s.includes('pret')) return 'Prêt à livrer';
  return 'À planifier';
}

function avancementPct(cmd: Commande): number {
  if (typeof cmd.avancement === 'number' && Number.isFinite(cmd.avancement)) {
    return Math.max(0, Math.min(100, Math.round(cmd.avancement)));
  }
  const s = (cmd.statut || '').toLowerCase();
  if (s.includes('livré') || s.includes('livre') || s.includes('clôtur') || s.includes('clotur')) return 100;
  if (s.includes('facture')) return 95;
  if (s.includes('prêt') || s.includes('pret')) return 90;
  if (s.includes('finition') || s.includes('contrôle') || s.includes('controle')) return 75;
  if (s.includes('production') || s.includes('impression')) return 50;
  if (s.includes('planifi')) return 20;
  return 10;
}

function cmdFilterMatch(cmd: Commande, filter: string): boolean {
  if (!filter) return true;
  const s = (cmd.statut || '').toLowerCase();
  if (filter === 'À planifier') {
    return s.includes('planifi') || s.includes('attente') || s === 'confirmée' || s === 'confirmee';
  }
  if (filter === 'En production') {
    return s.includes('production') || s.includes('impression') || s.includes('finition');
  }
  if (filter === 'En retard') {
    return s.includes('retard') || cmd.priorite === 'Urgente' || cmd.priorite === 'Haute';
  }
  return cmd.statut === filter;
}

export default function PlanningPage() {
  const router = useRouter();
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const liveTick = useOrionLiveRevision(['commandes', 'production', 'paiements', 'devis', 'sync'], {
    debounceMs: 400,
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  /** commandeId → % calculé depuis les tâches métier */
  const [taskProgressByCmd, setTaskProgressByCmd] = useState<Record<string, number>>({});
  const [etapesMeta, setEtapesMeta] = useState<FluxEtape[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'gantt' | 'list'>('gantt');
  const [ganttDate, setGanttDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [shiftMode, setShiftMode] = useState<GanttShiftMode>('day');
  const [cmdFilter, setCmdFilter] = useState('');
  const [cmdQuery, setCmdQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggingCmdId, setDraggingCmdId] = useState<string | null>(null);
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);
  const [sidebarDropActive, setSidebarDropActive] = useState(false);
  const [form, setForm] = useState({
    title: '',
    machine: '',
    operateur: '',
    date: '',
    startTime: '08:00',
    endTime: '12:00',
  });
  const [slotDetail, setSlotDetail] = useState<Slot | null>(null);
  const [detailEdit, setDetailEdit] = useState({
    statut: 'Planifié',
    operateur: '',
    machine: '',
    startTime: '08:00',
    endTime: '12:00',
  });
  const [selectedCmdId, setSelectedCmdId] = useState<string | null>(null);
  /** Intervenants choisis pour la tâche focus (plusieurs personnes). */
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  /** Créneau mis en focus (1 clic) — pour teintes de la carte. */
  const [focusedSlot, setFocusedSlot] = useState<Slot | null>(null);

  useEffect(() => {
    if (commandeId) return;
    try {
      const saved = sessionStorage.getItem(PLANNING_FOCUS_KEY);
      if (saved) setSelectedCmdId(saved);
    } catch {
      /* ignore */
    }
  }, [commandeId]);

  useEffect(() => {
    try {
      if (selectedCmdId) sessionStorage.setItem(PLANNING_FOCUS_KEY, selectedCmdId);
      else sessionStorage.removeItem(PLANNING_FOCUS_KEY);
    } catch {
      /* ignore */
    }
  }, [selectedCmdId]);

  const etapes = useMemo(
    () => (etapesMeta.length > 0 ? etapesMeta.map((e) => e.name) : ['Impression', 'Façonnage', 'Contrôle qualité']),
    [etapesMeta],
  );

  const etapeHints = useMemo(() => {
    const hints: Record<string, string> = {};
    for (const e of etapesMeta) {
      if (e.responsibleRole) hints[e.name] = e.responsibleRole;
    }
    return hints;
  }, [etapesMeta]);

  const range = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - 2);
    const to = new Date(from);
    to.setDate(to.getDate() + 21);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const p = new URLSearchParams({ from: range.from, to: range.to });
      const [sr, cr, rr, tr] = await Promise.all([
        fetch(`/api/planning?${p}`, { cache: 'no-store' }),
        fetch('/api/commandes?all=1', { cache: 'no-store' }),
        fetch('/api/planning/resources', { cache: 'no-store' }),
        fetch('/api/equipe/taches', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (sr.ok) setSlots(unwrapListItems(await sr.json()));
      if (cr.ok) setCommandes(unwrapListItems(await cr.json()));
      if (rr.ok) {
        const res = unwrapApiData<{ etapes?: FluxEtape[]; operators?: Operator[] }>(await rr.json());
        if (Array.isArray(res?.etapes) && res.etapes.length > 0) {
          setEtapesMeta(res.etapes);
          setForm((f) => ({ ...f, machine: f.machine || res.etapes![0]!.name }));
        }
        if (Array.isArray(res?.operators)) setOperators(res.operators);
      }
      if (tr.ok) {
        const tasks = unwrapListItems<{
          title?: string;
          status?: string;
          statut?: string;
          assigneeName?: string | null;
          commandeId?: string | null;
          commande?: { id?: string } | null;
        }>(await tr.json());
        const byCmd = new Map<string, { title: string; status: string; assigneeName?: string | null }[]>();
        for (const t of tasks) {
          const cid = t.commandeId || t.commande?.id;
          if (!cid) continue;
          const list = byCmd.get(cid) ?? [];
          list.push({
            title: String(t.title ?? ''),
            status: String(t.status ?? t.statut ?? 'À faire'),
            assigneeName: t.assigneeName ?? null,
          });
          byCmd.set(cid, list);
        }
        const next: Record<string, number> = {};
        for (const [cid, list] of byCmd) {
          next[cid] = computeCommandeAvancementFromTasks(list).avancement;
        }
        setTaskProgressByCmd(next);
      } else {
        setTaskProgressByCmd({});
      }
    } catch {
      uxToast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (liveTick === 0) return;
    void load({ silent: true });
  }, [liveTick, load]);

  useEffect(() => {
    if (!commandeId || commandes.length === 0) return;
    const cmd = commandes.find((c) => c.id === commandeId);
    if (cmd) {
      setForm((f) => ({ ...f, title: `${cmd.numero} · ${cmd.article}` }));
      setSelectedCmdId(cmd.id);
    }
  }, [commandeId, commandes]);

  /* Garde l’étape Commercial « Commandes » alignée quand on ouvre le Gantt lié */
  useEffect(() => {
    if (!commandeId) return;
    void import('@/lib/commercial/commercial-journey-store').then(({ emitCommercialJourney }) => {
      emitCommercialJourney('manual', {
        preferredStep: 'commandes',
        lastCommandeId: commandeId,
      });
    });
  }, [commandeId]);

  /** Gantt dédié à UNE commande : vierge si aucune sélection / mémoire si déjà planifiée. */
  const displaySlots = useMemo(() => {
    const focusId = selectedCmdId ?? commandeId;
    const active = slots.filter((s) => isActivePlanningStatut(normalizeSlotStatut(s.statut)));
    const base = focusId ? active.filter((s) => s.commandeId === focusId) : [];
    const cmdById = new Map(commandes.map((c) => [c.id, c]));
    return base.map((s) => {
      const cmd = s.commandeId ? cmdById.get(s.commandeId) : undefined;
      const taskPct = s.commandeId ? taskProgressByCmd[s.commandeId] : undefined;
      const progress = resolveGanttSlotProgress({
        taskProgress: taskPct,
        commandeAvancement: cmd ? avancementPct(cmd) : null,
        slotStatut: s.statut,
      });
      return { ...s, progress };
    });
  }, [slots, commandeId, selectedCmdId, commandes, taskProgressByCmd]);

  useEffect(() => {
    const d = ganttDate.toISOString().slice(0, 10);
    setForm((f) => ({ ...f, date: d }));
  }, [ganttDate]);

  const create = async () => {
    if (saving) return;
    if (!form.title || !form.date) return uxToast.error('Titre et date requis');
    const startAt = new Date(`${form.date}T${form.startTime}:00`).toISOString();
    const endAt = new Date(`${form.date}T${form.endTime}:00`).toISOString();
    setSaving(true);
    try {
      const r = await fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          machine: form.machine || etapes[0] || null,
          operateur: form.operateur
            || (selectedAssignees.length ? joinOperatorNames(selectedAssignees) : null),
          startAt,
          endAt,
          commandeId: selectedCmdId,
          statut: 'Planifié',
        }),
      });
      if (r.ok) {
        uxToast.success('Créneau planifié');
        setShowForm(false);
        void load();
      } else {
        const err = await r.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Erreur création'));
      }
    } finally {
      setSaving(false);
    }
  };

  const planAt = async (
    cmd: Commande,
    opts: { machine?: string; startAt: string; endAt?: string; operateur?: string | null },
  ) => {
    const etape = opts.machine || etapes[0] || '';
    const meta = etapesMeta.find((e) => e.name === etape);
    const remaining = meta
      ? remainingForEtape(slots, cmd.id, etape, meta.targetDelayHours)
      : Math.max(
          PLANNING_MIN_SLOT_MIN,
          estimateCommandeMinutes(etapesMeta, etape)
            - slots
              .filter((s) => s.commandeId === cmd.id)
              .reduce(
                (sum, s) =>
                  sum
                  + Math.max(
                    0,
                    Math.round((new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) / 60_000),
                  ),
                0,
              ),
        );
    if (remaining < PLANNING_MIN_SLOT_MIN) {
      uxToast.error('Plus de durée restante à planifier pour cette étape');
      return;
    }
    const endAt = cappedEndIso(opts.startAt, remaining, shiftMode);
    const plannedMin = Math.round((new Date(endAt).getTime() - new Date(opts.startAt).getTime()) / 60_000);
    const r = await fetch('/api/planning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${cmd.numero} · ${cmd.article}`,
        machine: etape || null,
        operateur: opts.operateur
          ?? (selectedAssignees.length ? joinOperatorNames(selectedAssignees) : null),
        commandeId: cmd.id,
        startAt: opts.startAt,
        endAt,
        statut: 'Planifié',
      }),
    });
    if (r.ok) {
      const left = Math.max(0, remaining - plannedMin);
      uxToast.success(
        left > 0
          ? `Planifié · ${etape} · ${formatDurationFr(plannedMin)} (reste ${formatDurationFr(left)})`
          : `Planifié · ${etape} · ${formatDurationFr(plannedMin)}`,
      );
      setSelectedCmdId(cmd.id);
      void load();
    } else {
      const err = await r.json().catch(() => ({}));
      uxToast.error(getApiErrorMessage(err, 'Erreur planification'));
    }
  };

  const planFromCommande = async (cmd: Commande, etape?: string) => {
    const dateStr = ganttDate.toISOString().slice(0, 10);
    const startH = shiftMode === 'day' ? '09:00' : '18:00';
    await planAt(cmd, {
      machine: etape || etapes[0],
      startAt: new Date(`${dateStr}T${startH}:00`).toISOString(),
    });
  };

  const onExternalDrop = async (drop: GanttExternalDrop) => {
    const cmd = commandes.find((c) => c.id === drop.commandeId);
    if (!cmd) return;
    await planAt(cmd, {
      machine: drop.resource,
      startAt: drop.startAt,
    });
  };

  const remove = async (id: string) => {
    const r = await fetch(`/api/planning/${id}`, { method: 'DELETE' });
    if (r.ok) {
      uxToast.success('Créneau déplanifié — durée rendue au pool');
      void load();
    }
  };

  const unplanSlot = async (id: string) => {
    await remove(id);
    setFocusedSlot((prev) => (prev?.id === id ? null : prev));
    setSlotDetail((prev) => (prev?.id === id ? null : prev));
  };

  const updateSlot = async (
    id: string,
    patch: Partial<Pick<Slot, 'startAt' | 'endAt' | 'machine' | 'operateur' | 'statut' | 'title'>>,
    opts?: { quiet?: boolean },
  ): Promise<boolean> => {
    const nextStatut = patch.statut ? normalizeSlotStatut(patch.statut) : undefined;
    const body = {
      ...patch,
      ...(nextStatut ? { statut: nextStatut } : {}),
    };
    const r = await fetch(`/api/planning/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const updated = await r.json();
      const merged = { ...updated, ...(nextStatut ? { statut: nextStatut } : {}) } as Slot;
      const done = nextStatut
        ? !isActivePlanningStatut(nextStatut)
        : !isActivePlanningStatut(normalizeSlotStatut(String(merged.statut || '')));
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...merged } : s)));
      if (done) {
        setSlotDetail((prev) => (prev?.id === id ? null : prev));
        setFocusedSlot((prev) => (prev?.id === id ? null : prev));
        if (!opts?.quiet) {
          uxToast.success(
            nextStatut === 'Annulé' ? 'Créneau annulé — retiré du planning' : 'Créneau terminé — retiré du Gantt',
            { duration: 1800 },
          );
        }
      } else {
        setSlotDetail((prev) => (prev?.id === id ? { ...prev, ...merged } : prev));
        setFocusedSlot((prev) => (prev?.id === id ? { ...prev, ...merged } : prev));
        if (!opts?.quiet) uxToast.success('Créneau mis à jour', { duration: 1500 });
      }
      return true;
    }
    uxToast.error('Erreur mise à jour');
    void load();
    return false;
  };

  /** Sync immédiate Intervenant / État depuis la fiche → Gantt + pool. */
  const applyDetailMeta = async (patch: { statut?: string; operateur?: string }) => {
    if (!slotDetail) return;
    if (patch.statut !== undefined) {
      const statut = normalizeSlotStatut(patch.statut);
      setDetailEdit((d) => ({ ...d, statut }));
      await updateSlot(slotDetail.id, { statut });
      return;
    }
    if (patch.operateur !== undefined) {
      setDetailEdit((d) => ({ ...d, operateur: patch.operateur ?? '' }));
      await updateSlot(slotDetail.id, { operateur: patch.operateur || null }, { quiet: true });
    }
  };

  const openSlotDetail = (s: Slot) => {
    setSlotDetail(s);
    setDetailEdit({
      statut: normalizeSlotStatut(s.statut || 'Planifié'),
      operateur: s.operateur ?? '',
      machine: s.machine ?? etapes[0] ?? '',
      startTime: isoToTimeInput(s.startAt),
      endTime: isoToTimeInput(s.endAt),
    });
    if (s.commandeId) setSelectedCmdId(s.commandeId);
    setFocusedSlot(s);
  };

  /** 1 clic : focus card (teintes claires). */
  const focusSlot = (s: Slot) => {
    setFocusedSlot(s);
    if (s.commandeId) setSelectedCmdId(s.commandeId);
  };

  const applyDetailTimes = async (startTime: string, endTime: string) => {
    if (!slotDetail) return;
    const times = buildSlotTimesFromEdit(slotDetail, startTime, endTime);
    if (!times) {
      uxToast.error('Horaires invalides');
      return;
    }
    if (new Date(times.endAt) <= new Date(times.startAt)) {
      uxToast.error('La fin doit être après le début');
      return;
    }
    const sameStart = new Date(times.startAt).getTime() === new Date(slotDetail.startAt).getTime();
    const sameEnd = new Date(times.endAt).getTime() === new Date(slotDetail.endAt).getTime();
    if (sameStart && sameEnd) return;
    await updateSlot(slotDetail.id, times);
    setDetailEdit((d) => ({
      ...d,
      startTime: isoToTimeInput(times.startAt),
      endTime: isoToTimeInput(times.endAt),
    }));
  };

  const saveSlotDetail = async () => {
    if (!slotDetail) return;
    const times = buildSlotTimesFromEdit(slotDetail, detailEdit.startTime, detailEdit.endTime);
    if (!times) {
      uxToast.error('Horaires invalides');
      return;
    }
    if (new Date(times.endAt) <= new Date(times.startAt)) {
      uxToast.error('La fin doit être après le début');
      return;
    }
    await updateSlot(slotDetail.id, {
      statut: normalizeSlotStatut(detailEdit.statut),
      operateur: detailEdit.operateur || null,
      machine: detailEdit.machine || null,
      startAt: times.startAt,
      endAt: times.endAt,
    });
  };

  const validateSlot = async () => {
    if (!slotDetail) return;
    await updateSlot(slotDetail.id, { statut: 'Terminé' });
  };

  const cmdRemaining = useCallback(
    (cmdId: string) => maxRemainingAcrossEtapes(slots, cmdId, etapesMeta),
    [etapesMeta, slots],
  );

  const filteredCmds = useMemo(() => {
    let list = commandes.filter((c) => !['Livré', 'Livrée', 'Terminée', 'Annulée', 'Annulé'].includes(c.statut));
    list = list.filter((c) =>
      isInCommandePool({
        commandeId: c.id,
        statut: c.statut,
        slots,
        day: ganttDate,
        remainingMin: cmdRemaining(c.id),
      }),
    );
    if (commandeId) {
      const linked = list.find((c) => c.id === commandeId);
      if (linked) list = [linked, ...list.filter((c) => c.id !== commandeId)];
    }
    if (cmdFilter) list = list.filter((c) => cmdFilterMatch(c, cmdFilter));
    if (cmdQuery.trim()) {
      const q = cmdQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.numero.toLowerCase().includes(q)
          || c.article.toLowerCase().includes(q)
          || (c.client?.name || '').toLowerCase().includes(q),
      );
    }
    return list.slice(0, 80);
  }, [commandes, cmdFilter, commandeId, cmdQuery, slots, ganttDate, cmdRemaining]);

  const draggingDropHours = useMemo(() => {
    if (!draggingCmdId) return 3;
    return hoursFromMinutes(cmdRemaining(draggingCmdId));
  }, [draggingCmdId, cmdRemaining]);

  const selectedCmd = useMemo(
    () => commandes.find((c) => c.id === (selectedCmdId ?? commandeId)) ?? null,
    [commandes, selectedCmdId, commandeId],
  );

  const focusCommande = useCallback((cmd: Commande | null) => {
    if (!cmd) {
      setSelectedCmdId(null);
      setSelectedAssignees([]);
      setFocusedSlot(null);
      return;
    }
    setSelectedCmdId(cmd.id);
    setFocusedSlot(null);
    const remembered = slots
      .filter((s) => s.commandeId === cmd.id)
      .flatMap((s) => splitOperatorNames(s.operateur));
    setSelectedAssignees(
      remembered.filter((n, i, all) => all.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i),
    );
  }, [slots]);

  const toggleAssignee = (name: string) => {
    setSelectedAssignees((prev) =>
      prev.some((n) => n.toLowerCase() === name.toLowerCase())
        ? prev.filter((n) => n.toLowerCase() !== name.toLowerCase())
        : [...prev, name],
    );
  };

  const focusGrad = useMemo(() => {
    if (focusedSlot) {
      return planningGradientForCommande(focusedSlot.commandeId, focusedSlot.title, focusedSlot.id);
    }
    if (selectedCmd) {
      return planningGradientForCommande(selectedCmd.id, `${selectedCmd.numero} · ${selectedCmd.article}`);
    }
    return planningGradientForCommande('default');
  }, [focusedSlot, selectedCmd]);

  const focusTint = useMemo(() => planningFocusTint(focusGrad), [focusGrad]);

  const focusTitle = focusedSlot?.title
    ?? (selectedCmd ? `${selectedCmd.numero} · ${selectedCmd.article}` : '');
  const focusSubtitle = selectedCmd
    ? `${selectedCmd.client?.name ?? '—'} · Logistique · ${logistiqueLabel(selectedCmd)}`
    : focusedSlot?.machine
      ? `Étape ${focusedSlot.machine}${focusedSlot.operateur ? ` · ${focusedSlot.operateur}` : ''}`
      : '';
  const focusPct = selectedCmd
    ? resolveGanttSlotProgress({
        taskProgress: taskProgressByCmd[selectedCmd.id] ?? focusedSlot?.progress,
        commandeAvancement: avancementPct(selectedCmd),
        slotStatut: focusedSlot?.statut,
      })
    : focusedSlot
      ? resolveGanttSlotProgress({
          taskProgress:
            focusedSlot.progress
            ?? (focusedSlot.commandeId ? taskProgressByCmd[focusedSlot.commandeId] : null),
          slotStatut: focusedSlot.statut,
        })
      : 0;

  const grouped = useMemo(() => {
    const g: Record<string, Slot[]> = {};
    for (const s of displaySlots) {
      const day = new Date(s.startAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      if (!g[day]) g[day] = [];
      g[day].push(s);
    }
    return g;
  }, [displaySlots]);

  const shiftDay = (delta: number) => {
    setGanttDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + delta);
      return n;
    });
  };

  const onCmdDragStart = (e: React.DragEvent, cmd: Commande) => {
    e.dataTransfer.setData('application/x-orion-commande', cmd.id);
    e.dataTransfer.setData('text/plain', cmd.numero);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingCmdId(cmd.id);
    focusCommande(cmd);
  };

  const onSidebarDragOver = (e: React.DragEvent) => {
    const types = [...e.dataTransfer.types];
    if (!types.includes('application/x-orion-slot')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setSidebarDropActive(true);
  };

  const onSidebarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setSidebarDropActive(false);
    const slotId = e.dataTransfer.getData('application/x-orion-slot');
    setDraggingSlotId(null);
    if (slotId) void unplanSlot(slotId);
  };

  const daySlotsCount = useMemo(
    () => displaySlots.filter((s) => {
      const d = new Date(s.startAt);
      return d.getFullYear() === ganttDate.getFullYear()
        && d.getMonth() === ganttDate.getMonth()
        && d.getDate() === ganttDate.getDate();
    }).length,
    [displaySlots, ganttDate],
  );

  const weekLabel = useMemo(() => {
    const onejan = new Date(ganttDate.getFullYear(), 0, 1);
    const week = Math.ceil((((ganttDate.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    const isToday = (() => {
      const t = new Date();
      return sameDayLocal(t, ganttDate);
    })();
    return `Semaine ${week}${isToday ? ' · Aujourd’hui' : ''}`;
  }, [ganttDate]);

  return (
    <div
      className="orion-page space-y-3.5"
      style={{
        background:
          'radial-gradient(circle at 10% 0, #eef3ff 0, transparent 32%)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[7px] text-white font-black text-lg bg-gradient-to-br from-[#437bf7] to-[#7a55ef] shadow-[0_10px_24px_rgba(69,109,241,0.24)]">
            A
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-[#172033] dark:text-foreground m-0">
              Planning atelier
            </h1>
            <p className="text-[11px] text-[#71809a] mt-0.5 m-0">
              A.N.S Design Print · Flux de production
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView(view === 'gantt' ? 'list' : 'gantt')}
            className="h-[38px] rounded-[7px] border border-[#e7ebf3] bg-white px-3.5 text-[13px] font-bold text-[#47536b] shadow-sm hover:bg-[#f8fafc]"
          >
            {view === 'gantt' ? 'Liste' : 'Gantt'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="h-[38px] rounded-[7px] border border-[#e7ebf3] bg-white px-3.5 text-[13px] font-bold text-[#47536b] shadow-sm hover:bg-[#f8fafc] inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Actualiser
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="h-[38px] rounded-[7px] border-0 bg-[#172033] px-4 text-[13px] font-bold text-white shadow-sm hover:brightness-110 inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Planifier
          </button>
        </div>
      </div>

      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}

      <div className={cn(PLANNING_SURFACE_SOFT, 'grid grid-cols-2 lg:grid-cols-4 overflow-hidden')}>
        {[
          { label: 'Créneaux actifs', value: displaySlots.length, hint: `sur ${etapes.length} étapes`, c: '#3b72f2' },
          { label: 'Commandes du jour', value: daySlotsCount, hint: fmtDay(ganttDate), c: '#8b59e8' },
          { label: 'À planifier', value: filteredCmds.length, hint: 'à affecter à l’atelier', c: '#ef9a38' },
          {
            label: 'En cours',
            value: displaySlots.filter((s) => normalizeSlotStatut(s.statut) === 'En cours').length,
            hint: 'atelier',
            c: '#21a879',
          },
        ].map((k) => (
          <div
            key={k.label}
            className="relative min-h-[76px] px-[18px] py-3.5 border-l border-[#e7ebf3] dark:border-border first:border-l-0 max-lg:odd:border-l-0 max-lg:[&:nth-child(3)]:border-l-0"
          >
            <small className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#71809a]">
              {k.label}
            </small>
            <strong className="block mt-1 text-[25px] font-extrabold tabular-nums leading-tight text-[#172033] dark:text-foreground">
              {String(k.value).padStart(2, '0')}
            </strong>
            <span className="absolute right-4 bottom-3.5 text-[11px] text-[#71809a] capitalize truncate max-w-[55%]">
              {k.hint}
            </span>
            <i
              className="absolute left-0 bottom-0 h-[3px] w-[42%] rounded-tr"
              style={{ background: k.c }}
              aria-hidden
            />
          </div>
        ))}
      </div>

      <OrionErrorBoundary zone="planning">
        {view === 'gantt' ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(850px,1fr)_314px] gap-3.5 items-start">
            <div className={cn(PLANNING_SURFACE, 'min-w-0')}>
              <div className="h-[68px] px-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#e7ebf3] dark:border-border">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => shiftDay(-1)}
                    className="h-[38px] w-[38px] rounded-[7px] border border-[#e7ebf3] bg-white text-[#47536b] font-bold shadow-sm"
                    aria-label="Jour précédent"
                  >
                    ‹
                  </button>
                  <div className="min-w-[170px] text-center px-1">
                    <b className="block text-[13px] capitalize text-[#172033] dark:text-foreground">{fmtDay(ganttDate)}</b>
                    <span className="text-[10px] text-[#71809a]">{weekLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => shiftDay(1)}
                    className="h-[38px] w-[38px] rounded-[7px] border border-[#e7ebf3] bg-white text-[#47536b] font-bold shadow-sm"
                    aria-label="Jour suivant"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Date();
                      t.setHours(0, 0, 0, 0);
                      setGanttDate(t);
                    }}
                    className="rounded-[7px] bg-[#f2f5fa] border border-[#e7ebf2] px-2.5 py-2 text-[11px] font-bold text-[#64718a]"
                  >
                    Aujourd&apos;hui
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href="/administration/production-flux"
                    className="rounded-[7px] bg-[#f2f5fa] border border-[#e7ebf2] px-2.5 py-2 text-[11px] font-bold text-[#64718a] hover:text-[#172033]"
                  >
                    {etapes.length} étapes du flux
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShiftMode('day')}
                    className={cn(
                      'rounded-[7px] border px-2.5 py-2 text-[10px] font-extrabold transition-colors',
                      shiftMode === 'day'
                        ? 'bg-[#eef3ff] border-[#3b72f2] text-[#3769db] ring-1 ring-[#3b72f2]/30'
                        : 'bg-white border-[#e7ebf2] text-[#8a95a8] hover:bg-[#f8fafc]',
                    )}
                  >
                    Jour 08–17
                  </button>
                  <button
                    type="button"
                    onClick={() => setShiftMode('night')}
                    className={cn(
                      'rounded-[7px] border px-2.5 py-2 text-[10px] font-extrabold transition-colors',
                      shiftMode === 'night'
                        ? 'bg-[#f3f0ff] border-[#7c6bf0] text-[#5b4fcf] ring-1 ring-[#7c6bf0]/30'
                        : 'bg-white border-[#e7ebf2] text-[#8a95a8] hover:bg-[#f8fafc]',
                    )}
                  >
                    Nuit 17–08
                  </button>
                </div>
              </div>

              {(selectedCmd || focusedSlot) ? (
                <div
                  className="mx-3 my-2.5 px-3.5 py-3 rounded-[7px] flex flex-wrap items-center justify-between gap-3 border"
                  style={{
                    borderColor: focusTint.border,
                    background: focusTint.background,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <i
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: focusTint.dot, boxShadow: `0 0 0 5px ${focusTint.ring}` }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <b className="block text-[12px] text-[#172033] truncate">{focusTitle}</b>
                      {focusSubtitle ? (
                        <p className="m-0 mt-1 text-[10px] text-[#71809a] truncate">{focusSubtitle}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-[200px]">
                    <div
                      className="h-1.5 flex-1 rounded-full overflow-hidden"
                      style={{ background: focusTint.track }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${focusPct}%`, background: focusTint.fill }}
                      />
                    </div>
                    <strong className="text-[11px] font-extrabold tabular-nums text-[#172033]">
                      {focusPct}%
                    </strong>
                    {selectedCmd ? (
                      <>
                        <button
                          type="button"
                          onClick={() => router.push(`/commandes/${selectedCmd.id}`)}
                          className="h-[34px] rounded-[7px] border border-[#e7ebf3] bg-white px-3 text-[11px] font-bold text-[#47536b]"
                        >
                          Ouvrir
                        </button>
                        <button
                          type="button"
                          onClick={() => focusCommande(null)}
                          className="h-[34px] rounded-[7px] border border-[#e7ebf3] bg-white px-3 text-[11px] font-bold text-[#47536b]"
                        >
                          Nouvelle tâche
                        </button>
                      </>
                    ) : focusedSlot ? (
                      <button
                        type="button"
                        onClick={() => openSlotDetail(focusedSlot)}
                        className="h-[34px] rounded-[7px] border border-[#e7ebf3] bg-white px-3 text-[11px] font-bold text-[#47536b]"
                      >
                        Fiche
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {selectedCmd && operators.length > 0 ? (
                <div className="mx-3 mb-2 px-3 py-2.5 rounded-[7px] border border-[#e7ebf3] bg-[#f8fafc] dark:bg-muted/20 dark:border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={13} className="text-[#3b72f2] shrink-0" />
                    <p className="m-0 text-[10px] font-extrabold uppercase tracking-wide text-[#71809a]">
                      Qui occupe cette tâche
                    </p>
                    <span className="text-[10px] text-[#97a2b4]">
                      {selectedAssignees.length > 0
                        ? `${selectedAssignees.length} personne${selectedAssignees.length > 1 ? 's' : ''}`
                        : 'plusieurs choix possibles'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {operators.map((op) => {
                      const on = selectedAssignees.some((n) => n.toLowerCase() === op.name.toLowerCase());
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => toggleAssignee(op.name)}
                          className={cn(
                            'rounded-[7px] px-2 py-1 text-[10px] font-bold border transition-colors',
                            on
                              ? 'bg-[#e9efff] border-[#3b72f2] text-[#3769db]'
                              : 'bg-white border-[#e7ebf3] text-[#64718a] hover:border-[#c5d0e0]',
                          )}
                        >
                          {op.name}
                          <span className="ml-1 font-semibold opacity-60">{op.role}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {!selectedCmd && !loading ? (
                <div className="mx-3 mb-2 px-3.5 py-3 rounded-[7px] border border-dashed border-[#d5deea] bg-[#fbfcfe] text-[11px] text-[#71809a] leading-relaxed">
                  Choisissez une commande dans le pool. Le Gantt affiche uniquement cette tâche — vierge
                  si rien n’est encore planifié, ou la mémoire des étapes déjà posées. Glissez ensuite
                  sur 01 Client, 02 Devis, BAT… (plusieurs étapes, plusieurs personnes).
                </div>
              ) : null}

              {loading ? (
                <div className="p-14 text-center text-[#71809a] text-sm">Chargement Gantt…</div>
              ) : (
                <ProductionGantt
                  slots={displaySlots}
                  date={ganttDate}
                  shiftMode={shiftMode}
                  resources={etapes}
                  resourceHints={etapeHints}
                  onSlotClick={focusSlot}
                  onSlotDoubleClick={openSlotDetail}
                  onSlotUpdate={async (id, patch) => {
                    await updateSlot(id, patch);
                  }}
                  onExternalDrop={onExternalDrop}
                  externalDropDurationHours={draggingDropHours}
                  onSlotUnplanDragStart={(slot) => setDraggingSlotId(slot.id)}
                  onSlotUnplanDragEnd={() => {
                    setDraggingSlotId(null);
                    setSidebarDropActive(false);
                  }}
                />
              )}
            </div>

            <aside
              className={cn(
                PLANNING_SURFACE,
                'overflow-hidden flex flex-col',
                'h-[calc(100vh-10.5rem)] max-h-[calc(100vh-10.5rem)] min-h-[520px]',
                'xl:sticky xl:top-20',
                draggingCmdId && 'ring-2 ring-[#3b72f2]/25',
                (sidebarDropActive || draggingSlotId) && 'ring-2 ring-[#dd3565]/35 bg-[#fff8fa]',
              )}
              onDragOver={onSidebarDragOver}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setSidebarDropActive(false);
              }}
              onDrop={onSidebarDrop}
            >
              <div className="px-4 pt-4 pb-3 border-b border-[#e7ebf3] dark:border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-[20px] font-bold tracking-tight text-[#172033] dark:text-foreground m-0">
                    Commandes
                  </h2>
                </div>
                <p className="text-[10px] text-[#71809a] mt-1 mb-3">
                  {draggingSlotId
                    ? 'Déposez ici pour déplanifier (durée rendue)'
                    : 'Sélectionnez une tâche · glissez les étapes sur le Gantt (plusieurs personnes)'}
                </p>
                <input
                  type="search"
                  placeholder="Rechercher n°, client ou article…"
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  className="h-[38px] w-full rounded-[7px] border border-[#e7ebf3] bg-[#f8fafc] px-3 text-[12px] outline-none focus:border-[#3b72f2]/40"
                />
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {[
                    { id: '', label: 'Toutes' },
                    { id: 'À planifier', label: 'À planifier' },
                    { id: 'En production', label: 'Production' },
                  ].map((f) => (
                    <button
                      key={f.id || 'all'}
                      type="button"
                      onClick={() => setCmdFilter(f.id)}
                      className={cn(
                        'rounded-[7px] px-2.5 py-1.5 text-[9px] font-extrabold transition-colors',
                        cmdFilter === f.id
                          ? 'bg-[#e9efff] text-[#3769db]'
                          : 'bg-[#f2f5f9] text-[#71809a]',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 grid gap-2 content-start">
                {filteredCmds.map((cmd) => {
                  const grad = planningGradientForCommande(
                    cmd.id,
                    `${cmd.numero} · ${cmd.article}`,
                  );
                  const cardTint = planningPoolCardTint(grad, {
                    priorite: cmd.priorite,
                    statut: cmd.statut,
                    selected: selectedCmdId === cmd.id,
                  });
                  return (
                    <article
                      key={cmd.id}
                      draggable
                      onDragStart={(e) => onCmdDragStart(e, cmd)}
                      onDragEnd={() => {
                        setDraggingCmdId(null);
                        setDraggingSlotId(null);
                        setSidebarDropActive(false);
                      }}
                      onClick={() => focusCommande(cmd)}
                      style={{
                        background: cardTint.background,
                        borderColor: cardTint.border,
                        boxShadow:
                          selectedCmdId === cmd.id
                            ? `0 0 0 1px ${cardTint.ring}, 0 8px 18px color-mix(in srgb, ${grad.c1} 14%, transparent)`
                            : undefined,
                      }}
                      className={cn(
                        'rounded-[7px] border p-2.5 cursor-grab active:cursor-grabbing transition-all select-none',
                        'hover:shadow-[0_8px_18px_rgba(48,70,109,0.08)] hover:-translate-y-px',
                        draggingCmdId === cmd.id && 'opacity-50',
                      )}
                    >
                      <div className="flex gap-2">
                        <span
                          className="text-sm leading-none mt-0.5 shrink-0"
                          style={{ color: cardTint.accent }}
                          aria-hidden
                        >
                          ⠿
                        </span>
                        <div className="min-w-0 flex-1">
                          <b
                            className="block text-[10px] truncate"
                            style={{ color: cardTint.numero }}
                          >
                            {cmd.numero}
                          </b>
                          <span className="block text-[9px] text-[#6f7d94] mt-0.5 truncate">
                            {cmd.client?.name ?? '—'} · {cmd.article}
                          </span>
                        </div>
                        <span
                          className="shrink-0 self-start rounded-[7px] px-1.5 py-0.5 text-[8px] font-extrabold tabular-nums"
                          style={{ background: cardTint.chipBg, color: cardTint.chipFg }}
                          title="Durée restante (Admin → Production & Flux)"
                        >
                          {formatDurationFr(cmdRemaining(cmd.id))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2.5 gap-2">
                        <span
                          className="text-[8px] rounded-[7px] px-2 py-1 truncate max-w-[55%] font-semibold"
                          style={{ background: cardTint.statutBg, color: cardTint.statutFg }}
                        >
                          {cmd.statut}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 rounded-[7px] border-0 text-white px-2.5 py-1.5 text-[9px] font-extrabold hover:brightness-110"
                          style={{
                            background: `linear-gradient(135deg, ${grad.c1}, ${grad.c2})`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            void planFromCommande(cmd);
                          }}
                        >
                          ＋ Planifier
                        </button>
                      </div>
                    </article>
                  );
                })}
                {filteredCmds.length === 0 && (
                  <p className="text-center text-[#71809a] py-10 text-xs px-3 leading-relaxed">
                    Aucune commande à planifier. Une commande payée (Commercial) apparaît ici — cliquez pour ouvrir son Gantt, puis glissez sur les étapes.
                  </p>
                )}
              </div>

              <div className="p-2.5 border-t border-[#e7ebf3] dark:border-border space-y-2">
                <Link
                  href="/administration/production-flux"
                  className="block w-full h-[34px] rounded-[7px] border border-[#e7ebf3] bg-[#f8fafc] text-[11px] font-bold text-[#47536b] text-center leading-[34px] hover:bg-white"
                >
                  Durées étapes · Admin Flux
                </Link>
                <button
                  type="button"
                  className="w-full h-[38px] rounded-[7px] border border-[#e7ebf3] bg-white text-[12px] font-bold text-[#47536b]"
                  onClick={() => router.push('/commandes')}
                >
                  Ouvrir le module Commandes ↗
                </button>
              </div>
            </aside>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, daySlots]) => (
              <div key={day}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{day}</h3>
                <div className="space-y-2">
                  {daySlots.map((s) => (
                    <div key={s.id} className={cn(PLANNING_SURFACE_SOFT, 'p-4 flex justify-between gap-3')}>
                      <button type="button" className="text-left flex-1" onClick={() => openSlotDetail(s)}>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(s.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {' → '}
                          {new Date(s.endAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {s.machine && ` · ${s.machine}`}
                          {s.operateur && ` · ${s.operateur}`}
                        </p>
                        <span className={`text-xs font-semibold ${STATUT_CLS[s.statut] ?? 'text-primary'}`}>
                          {s.statut}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(s.id)}
                        className="text-muted-foreground hover:text-red-500 p-2"
                        aria-label="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {slots.length === 0 && !loading && (
              <AppEmptyState
                icon={Calendar}
                title="Aucun créneau"
                description="Planifiez une tâche ou glissez une commande sur le Gantt."
              />
            )}
          </div>
        )}
      </OrionErrorBoundary>

      <PlanningSlotDetailModal
        slot={slotDetail}
        edit={detailEdit}
        onEditChange={(patch) => setDetailEdit((d) => ({ ...d, ...patch }))}
        etapes={etapes}
        operators={operators}
        onClose={() => setSlotDetail(null)}
        onSave={() => void saveSlotDetail()}
        onApplyTimes={(startTime, endTime) => void applyDetailTimes(startTime, endTime)}
        onApplyMeta={(patch) => void applyDetailMeta(patch)}
        onValidate={() => void validateSlot()}
        onDelete={() => {
          if (!slotDetail) return;
          void remove(slotDetail.id);
          setSlotDetail(null);
        }}
        onOpenCommande={
          slotDetail?.commandeId
            ? () => router.push(`/commandes/${slotDetail.commandeId}`)
            : undefined
        }
      />

      <AppFormModal
        open={showForm}
        onOpenChange={setShowForm}
        title="Planifier une tâche"
        footer={
          <AppFormModalFooter
            onCancel={() => setShowForm(false)}
            onSubmit={() => void create()}
            submitLabel="Planifier"
            loading={saving}
          />
        }
      >
        <input
          placeholder="Intitulé *"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className="w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className="bg-background border border-border rounded-[7px] px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            className="bg-background border border-border rounded-[7px] px-3 py-2 text-sm"
          />
        </div>
        <select
          value={form.machine || etapes[0]}
          onChange={(e) => setForm((f) => ({ ...f, machine: e.target.value }))}
          className="w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm"
        >
          {etapes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {operators.length > 0 ? (
          <select
            value={form.operateur}
            onChange={(e) => setForm((f) => ({ ...f, operateur: e.target.value }))}
            className="w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm"
          >
            <option value="">Intervenant (optionnel)</option>
            {operators.map((op) => (
              <option key={op.id} value={op.name}>
                {op.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            placeholder="Intervenant / responsable"
            value={form.operateur}
            onChange={(e) => setForm((f) => ({ ...f, operateur: e.target.value }))}
            className="w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm"
          />
        )}
      </AppFormModal>
    </div>
  );
}
