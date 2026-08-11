import { canViewMargin } from '@/lib/auth/margin-access';
import {
  parseMachineNotes,
  serializeMachineNotes,
  type MachineGpaoMeta,
} from '@/lib/gpao-meta';

/** Retire coûts machine (finance + coût interventions) si pas pos:view_margin. */
export function stripMachineNotesForRole(
  notes: string | null | undefined,
  role: string,
): string | null {
  if (!notes) return notes ?? null;
  if (canViewMargin(role)) return notes;

  const meta = parseMachineNotes(notes);
  const stripped: MachineGpaoMeta = {
    ...meta,
    finance: {},
    interventions: meta.interventions.map((iv) => {
      const { costMGA: _c, ...rest } = iv;
      return rest;
    }),
  };
  return serializeMachineNotes(stripped);
}

export function stripMachineRecordForRole<T extends { notes?: string | null }>(
  machine: T,
  role: string,
): T {
  if (canViewMargin(role)) return machine;
  return {
    ...machine,
    notes: stripMachineNotesForRole(machine.notes, role),
  };
}
