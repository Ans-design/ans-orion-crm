import { describe, expect, it } from 'vitest';
import {
  MADA_EXPERT_VALIDATION_ITEMS,
  madaExportDisclaimerBlock,
} from '@/lib/finance/mada-compliance-meta';

describe('mada-compliance-meta', () => {
  it('expose une checklist expert non vide', () => {
    expect(MADA_EXPERT_VALIDATION_ITEMS.length).toBeGreaterThanOrEqual(4);
  });

  it('génère un bloc disclaimer pour exports comptables', () => {
    const block = madaExportDisclaimerBlock();
    expect(block).toContain('NON CERTIFIE');
    expect(block).toContain('Madagascar');
  });
});
