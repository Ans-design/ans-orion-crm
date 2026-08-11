/** Métadonnées GPAO encodées dans le champ `notes` (JSON préfixé). */

export type ConsumableEntry = {
  name: string;
  qty: string;
  lastRefill?: string;
  /** Niveau stock optionnel (HTML v29 : used / capacity). */
  used?: number;
  capacity?: number;
  unit?: string;
};
export type InterventionEntry = { date: string; type: string; description: string; costMGA?: number };
export type MachineFinanceMeta = { monthlyCostMGA?: number; depreciationMGA?: number; notes?: string };

export type MachineGpaoMeta = {
  consumables: ConsumableEntry[];
  interventions: InterventionEntry[];
  finance: MachineFinanceMeta;
  userNotes?: string;
};

export type EmployeeAttachment = { id: string; name: string; url?: string; uploadedAt: string };
export type EmployeeImpactEntry = {
  id: string;
  at: string;
  kind: 'reclamation' | 'dechet';
  title: string;
  detail?: string;
  refId?: string;
  priorite?: string;
};
export type EmployeeNotesMeta = {
  loginPassword?: string;
  attachments: EmployeeAttachment[];
  userNotes?: string;
  /** Journal auto : réclamations clients + déchets / pertes. */
  impacts?: EmployeeImpactEntry[];
};

const MACHINE_PREFIX = '::GPAO::';
const EMPLOYEE_PREFIX = '::RH::';

function tryParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function parseMachineNotes(notes: string | null | undefined): MachineGpaoMeta {
  const empty: MachineGpaoMeta = { consumables: [], interventions: [], finance: {} };
  if (!notes?.trim()) return empty;
  if (notes.startsWith(MACHINE_PREFIX)) {
    const parsed = tryParseJson<MachineGpaoMeta>(notes.slice(MACHINE_PREFIX.length));
    if (parsed) return { ...empty, ...parsed, consumables: parsed.consumables ?? [], interventions: parsed.interventions ?? [], finance: parsed.finance ?? {} };
  }
  return { ...empty, userNotes: notes };
}

export function serializeMachineNotes(meta: MachineGpaoMeta): string | null {
  const hasMeta =
    meta.consumables.length > 0 ||
    meta.interventions.length > 0 ||
    meta.finance.monthlyCostMGA ||
    meta.finance.depreciationMGA ||
    meta.finance.notes;
  if (!hasMeta && !meta.userNotes?.trim()) return null;
  if (!hasMeta) return meta.userNotes?.trim() || null;
  return `${MACHINE_PREFIX}${JSON.stringify(meta)}`;
}

export function parseEmployeeNotes(notes: string | null | undefined): EmployeeNotesMeta {
  const empty: EmployeeNotesMeta = { attachments: [] };
  if (!notes?.trim()) return empty;
  if (notes.startsWith(EMPLOYEE_PREFIX)) {
    const parsed = tryParseJson<EmployeeNotesMeta>(notes.slice(EMPLOYEE_PREFIX.length));
    if (parsed) return { ...empty, ...parsed, attachments: parsed.attachments ?? [] };
  }
  return { ...empty, userNotes: notes };
}

export function serializeEmployeeNotes(meta: EmployeeNotesMeta): string | null {
  const hasMeta =
    Boolean(meta.loginPassword)
    || meta.attachments.length > 0
    || (meta.impacts?.length ?? 0) > 0;
  if (!hasMeta && !meta.userNotes?.trim()) return null;
  if (!hasMeta) return meta.userNotes?.trim() || null;
  return `${EMPLOYEE_PREFIX}${JSON.stringify(meta)}`;
}
