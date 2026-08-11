import { describe, expect, it } from 'vitest';
import {
  parseEmployeeNotes,
  serializeEmployeeNotes,
  type EmployeeImpactEntry,
} from '@/lib/gpao-meta';

describe('employee notes — impacts SAV / déchets', () => {
  it('persiste et relit le journal impacts', () => {
    const impact: EmployeeImpactEntry = {
      id: 'rec-1',
      at: '2026-08-10T12:00:00.000Z',
      kind: 'reclamation',
      title: 'Retour impression',
      detail: 'Cmd CMD-1',
      refId: 'r1',
      priorite: 'Haute',
    };
    const raw = serializeEmployeeNotes({
      attachments: [],
      userNotes: '[2026-08-10] SAV — Retour impression',
      impacts: [impact],
    });
    expect(raw).toContain('::RH::');
    const parsed = parseEmployeeNotes(raw);
    expect(parsed.impacts).toHaveLength(1);
    expect(parsed.impacts?.[0]?.kind).toBe('reclamation');
    expect(parsed.impacts?.[0]?.title).toBe('Retour impression');
    expect(parsed.userNotes).toContain('SAV');
  });
});
