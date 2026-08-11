import { describe, it, expect } from 'vitest';
import { FACTURE_UNPAID_STATUTS } from '@/lib/data/status-registry';

describe('facture unpaid registry', () => {
  it('includes emitted and partial statuses', () => {
    expect(FACTURE_UNPAID_STATUTS).toContain('Émise');
    expect(FACTURE_UNPAID_STATUTS).toContain('Partiellement payée');
  });
});
