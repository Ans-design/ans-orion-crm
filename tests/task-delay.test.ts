import { describe, expect, it } from 'vitest';
import {
  delaySlotTitle,
  needsDelayDeclaration,
  nextWorkExtensionWindow,
  plannedEndAt,
  validateDelayInput,
} from '@/lib/metier/task-delay';

describe('retard de prod → Gantt', () => {
  it('détecte un créneau 13h–17h dépassé', () => {
    const due = new Date(2026, 7, 13, 13, 0, 0);
    const task = { status: 'En cours', dueDate: due, estimatedMin: 240 };
    const end = plannedEndAt(task)!;
    expect(end.getHours()).toBe(17);
    expect(needsDelayDeclaration(task, new Date(2026, 7, 13, 17, 1, 0).getTime())).toBe(true);
    expect(needsDelayDeclaration(task, new Date(2026, 7, 13, 16, 0, 0).getTime())).toBe(false);
  });

  it('n’exige plus de motif une fois le rajout déclaré sur le nouveau créneau', () => {
    const tomorrow = new Date(2026, 7, 14, 8, 0, 0);
    const declared = new Date(2026, 7, 13, 17, 10, 0);
    expect(
      needsDelayDeclaration(
        {
          status: 'En pause',
          dueDate: tomorrow,
          estimatedMin: 120,
          delayDeclaredAt: declared,
        },
        new Date(2026, 7, 13, 18, 0, 0).getTime(),
      ),
    ).toBe(false);
  });

  it('place le rajout demain matin', () => {
    const from = new Date(2026, 7, 13, 17, 30, 0);
    const w = nextWorkExtensionWindow(120, from);
    expect(w.startAt.getDate()).toBe(14);
    expect(w.startAt.getHours()).toBe(8);
    expect((w.endAt.getTime() - w.startAt.getTime()) / 60_000).toBe(120);
    expect(delaySlotTitle('Graphisme — CMD-1', 120)).toContain('Suite +2 h');
  });

  it('refuse un motif trop court', () => {
    expect(validateDelayInput('ok', 120)).toBeTruthy();
    expect(validateDelayInput('Fichiers client incomplets, BAT à corriger', 120)).toBeNull();
    expect(validateDelayInput('Fichiers client incomplets', 10)).toBeTruthy();
  });
});
