/**
 * Réclamations clients + déchets → notes employé & score performance (qualité).
 * - Si employeeId explicite : impact ciblé
 * - Sinon : tous les intervenants de la commande (tâches, production, planning)
 */

import { prisma } from '@/lib/prisma';
import {
  parseEmployeeNotes,
  serializeEmployeeNotes,
  type EmployeeImpactEntry,
} from '@/lib/gpao-meta';

const PERF_MIN = -5;
const PERF_MAX = 7;

function clampScore(n: number): number {
  return Math.max(PERF_MIN, Math.min(PERF_MAX, Math.round(n)));
}

function qualiteDeltaForPriorite(priorite?: string | null): number {
  const p = (priorite || 'Normale').toLowerCase();
  if (p.includes('urgent')) return -2;
  if (p.includes('haute')) return -1;
  if (p.includes('basse')) return 0;
  return -1;
}

function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveEmployeeIdsByNames(names: string[]): Promise<string[]> {
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (cleaned.length === 0) return [];

  const employees = await prisma.employee.findMany({
    where: { statut: 'Actif' },
    select: { id: true, firstName: true, lastName: true },
    take: 400,
  });

  const byFull = new Map<string, string>();
  for (const e of employees) {
    const full = normalizeName(`${e.firstName} ${e.lastName}`);
    byFull.set(full, e.id);
    byFull.set(normalizeName(`${e.lastName} ${e.firstName}`), e.id);
    byFull.set(normalizeName(e.firstName), e.id);
  }

  const ids = new Set<string>();
  for (const name of cleaned) {
    const hit = byFull.get(normalizeName(name));
    if (hit) ids.add(hit);
  }
  return [...ids];
}

async function resolveEmployeeIdsByUserIds(userIds: string[]): Promise<string[]> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const rows = await prisma.employee.findMany({
    where: { userId: { in: ids }, statut: 'Actif' },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Intervenants d’une commande (tâches métier, productions, créneaux planning). */
export async function resolveCommandeEmployeeIds(commandeId: string): Promise<string[]> {
  const [cmd, tasks, productions, slots] = await Promise.all([
    prisma.commande.findUnique({
      where: { id: commandeId },
      select: { operateur: true },
    }),
    prisma.metierTask.findMany({
      where: { commandeId },
      select: { assigneeId: true, assigneeName: true },
      take: 80,
    }),
    prisma.production.findMany({
      where: { commandeId },
      select: { operateur: true },
      take: 40,
    }),
    prisma.productionSlot.findMany({
      where: { commandeId },
      select: { operateur: true },
      take: 60,
    }),
  ]);

  const names: string[] = [];
  if (cmd?.operateur) names.push(cmd.operateur);
  for (const t of tasks) {
    if (t.assigneeName) names.push(t.assigneeName);
  }
  for (const p of productions) {
    if (p.operateur) names.push(p.operateur);
  }
  for (const s of slots) {
    if (s.operateur) names.push(s.operateur);
  }

  const fromUsers = await resolveEmployeeIdsByUserIds(
    tasks.map((t) => t.assigneeId).filter((id): id is string => Boolean(id)),
  );
  const fromNames = await resolveEmployeeIdsByNames(names);
  return [...new Set([...fromUsers, ...fromNames])];
}

export async function resolveImpactEmployeeIds(opts: {
  employeeId?: string | null;
  commandeId?: string | null;
  fallbackNames?: string[];
}): Promise<string[]> {
  if (opts.employeeId) {
    const e = await prisma.employee.findUnique({
      where: { id: opts.employeeId },
      select: { id: true },
    });
    return e ? [e.id] : [];
  }

  const ids = new Set<string>();
  if (opts.commandeId) {
    for (const id of await resolveCommandeEmployeeIds(opts.commandeId)) ids.add(id);
  }
  if (opts.fallbackNames?.length) {
    for (const id of await resolveEmployeeIdsByNames(opts.fallbackNames)) ids.add(id);
  }
  return [...ids];
}

async function appendEmployeeImpact(
  employeeId: string,
  entry: EmployeeImpactEntry,
  qualiteDelta: number,
): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, notes: true },
  });
  if (!employee) return;

  const meta = parseEmployeeNotes(employee.notes);
  const impacts = [...(meta.impacts ?? [])];
  if (entry.refId && impacts.some((i) => i.refId === entry.refId && i.kind === entry.kind)) {
    return;
  }
  impacts.unshift(entry);
  meta.impacts = impacts.slice(0, 80);

  const line = `[${entry.at.slice(0, 10)}] ${entry.kind === 'reclamation' ? 'SAV' : 'Déchet'} — ${entry.title}`;
  meta.userNotes = meta.userNotes?.trim()
    ? `${line}\n${meta.userNotes}`
    : line;

  await prisma.employee.update({
    where: { id: employeeId },
    data: { notes: serializeEmployeeNotes(meta) },
  });

  if (qualiteDelta === 0) return;

  const existing = await prisma.employeeEvaluation.findUnique({
    where: { employeeId_period: { employeeId, period: 'current' } },
  });
  const nextQualite = clampScore((existing?.qualite ?? 0) + qualiteDelta);
  const evalNote = `${line}${entry.detail ? ` · ${entry.detail}` : ''}`;
  const mergedNotes = existing?.notes?.trim()
    ? `${evalNote}\n${existing.notes}`
    : evalNote;

  await prisma.employeeEvaluation.upsert({
    where: { employeeId_period: { employeeId, period: 'current' } },
    create: {
      employeeId,
      period: 'current',
      ponctualite: existing?.ponctualite ?? 0,
      qualite: nextQualite,
      consignes: existing?.consignes ?? 0,
      notes: mergedNotes.slice(0, 4000),
      evaluatedBy: 'auto:impact',
    },
    update: {
      qualite: nextQualite,
      notes: mergedNotes.slice(0, 4000),
      evaluatedBy: 'auto:impact',
    },
  });
}

export async function recordReclamationEmployeeImpact(opts: {
  reclamationId: string;
  subject: string;
  description?: string | null;
  priorite?: string | null;
  employeeId?: string | null;
  commandeId?: string | null;
  commandeNumero?: string | null;
}): Promise<string[]> {
  const targets = await resolveImpactEmployeeIds({
    employeeId: opts.employeeId,
    commandeId: opts.commandeId,
  });
  if (targets.length === 0) return [];

  const at = new Date().toISOString();
  const title = opts.subject.trim();
  const detail = [
    opts.commandeNumero ? `Cmd ${opts.commandeNumero}` : null,
    opts.description?.trim() || null,
  ]
    .filter(Boolean)
    .join(' · ');
  const delta = qualiteDeltaForPriorite(opts.priorite);

  for (const employeeId of targets) {
    await appendEmployeeImpact(
      employeeId,
      {
        id: `rec-${opts.reclamationId}-${employeeId}`,
        at,
        kind: 'reclamation',
        title,
        detail: detail || undefined,
        refId: opts.reclamationId,
        priorite: opts.priorite ?? undefined,
      },
      delta,
    );
  }
  return targets;
}

export async function recordWasteEmployeeImpact(opts: {
  wasteId: string;
  matiere: string;
  quantity: number;
  unite: string;
  cause: string;
  employeeId?: string | null;
  commandeId?: string | null;
  declaredBy?: string | null;
}): Promise<string[]> {
  const targets = await resolveImpactEmployeeIds({
    employeeId: opts.employeeId,
    commandeId: opts.commandeId,
    fallbackNames: opts.declaredBy ? [opts.declaredBy] : undefined,
  });
  if (targets.length === 0) return [];

  const at = new Date().toISOString();
  const title = `${opts.matiere} · ${opts.quantity} ${opts.unite}`;
  const detail = opts.cause;
  const delta = opts.quantity >= 50 ? -2 : -1;

  for (const employeeId of targets) {
    await appendEmployeeImpact(
      employeeId,
      {
        id: `waste-${opts.wasteId}-${employeeId}`,
        at,
        kind: 'dechet',
        title,
        detail,
        refId: opts.wasteId,
      },
      delta,
    );
  }
  return targets;
}
