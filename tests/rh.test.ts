import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY, buildNavForRole } from '@/lib/modules';
import { ABSENCE_STATUTS, DEPARTEMENTS } from '@/lib/constants/rh';
import { computeRetardMin, parseHoraireMinutes } from '@/lib/services/rh-service';
import { ORION_ROADMAP } from '@/lib/modules/roadmap';

describe('RH module', () => {
  it('registers rh modules', () => {
    expect(MODULE_REGISTRY.rh_employes.href).toBe('/rh/employes');
    expect(MODULE_REGISTRY.rh_absences.status).toBe('active');
    expect(MODULE_REGISTRY.rh_annonces.href).toBe('/rh/annonces');
  });

  it('director nav includes RH section', () => {
    const ids = buildNavForRole('admin').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('rh_employes');
    expect(ids).toContain('rh_absences');
  });

  it('defines RH constants', () => {
    expect(DEPARTEMENTS).toContain('Production');
    expect(ABSENCE_STATUTS).toContain('En attente');
  });

  it('computes retard minutes', () => {
    expect(parseHoraireMinutes('08:00')).toBe(480);
    const checkIn = new Date(2026, 0, 1, 8, 20);
    expect(computeRetardMin(checkIn, '08:00')).toBe(20);
  });

  it('roadmap marks step 4 rh as done', () => {
    const step4 = ORION_ROADMAP.find((s) => s.id === 'rh');
    expect(step4?.status).toBe('done');
  });
});
