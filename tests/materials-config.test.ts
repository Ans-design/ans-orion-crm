import { describe, it, expect } from 'vitest';
import { DEFAULT_MATERIALS, grammagesForMaterial, activePrintMaterials } from '@/lib/data/materials-config';

describe('materials-config', () => {
  it('default materials include PCB with grammages', () => {
    const pcb = DEFAULT_MATERIALS.find((m) => m.label === 'PCB' && m.category === 'print');
    expect(pcb).toBeDefined();
    expect(pcb!.grammages).toContain('170g');
  });

  it('grammagesForMaterial returns weights for known material', () => {
    const gs = grammagesForMaterial(DEFAULT_MATERIALS, 'Offset');
    expect(gs).toEqual(['80g', '90g', '100g', '120g']);
  });

  it('activePrintMaterials filters inactive', () => {
    const mats = activePrintMaterials([
      ...DEFAULT_MATERIALS,
      { id: 'x', label: 'Test', category: 'print', actif: false, grammages: ['80g'] },
    ]);
    expect(mats.some((m) => m.label === 'Test')).toBe(false);
  });
});
