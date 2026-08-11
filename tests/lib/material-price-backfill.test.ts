import { describe, expect, it } from 'vitest';
import { resolvePrintingPriceLabels } from '@/lib/server/modules/materials/material-price-backfill';

describe('material-price-backfill', () => {
  it('maps offset key to ISF printing labels', () => {
    const labels = resolvePrintingPriceLabels('offset', 'Offset 80g');
    expect(labels).toContain('Standard / Offset · Couleur');
    expect(labels).toContain('Offset 80g');
  });

  it('maps pcb key to PCB printing label', () => {
    const labels = resolvePrintingPriceLabels('pcb', 'PCB 115g');
    expect(labels).toContain('PCB');
  });

  it('maps glossy key distinctly from pcb', () => {
    const glossy = resolvePrintingPriceLabels('glossy', 'Glossy 160g');
    const pcb = resolvePrintingPriceLabels('pcb', 'PCB 160g');
    expect(glossy).toContain('Glossy');
    expect(pcb).toContain('PCB');
    expect(glossy).not.toEqual(pcb);
  });
});
