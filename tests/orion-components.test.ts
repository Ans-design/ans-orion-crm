import { describe, expect, it } from 'vitest';
import * as Orion from '@/components/orion';

describe('Orion design system exports', () => {
  it('expose les composants Phase 5', () => {
    expect(Orion.OrionPageHeader).toBeTypeOf('function');
    expect(Orion.OrionActionBar).toBeTypeOf('function');
    expect(Orion.OrionCard).toBeTypeOf('function');
    expect(Orion.OrionDataTable).toBeTypeOf('function');
    expect(Orion.OrionColumnTable).toBeTypeOf('function');
    expect(Orion.OrionEmptyState).toBeTypeOf('function');
    expect(Orion.OrionSkeleton).toBeTypeOf('function');
    expect(Orion.OrionStatusBadge).toBeTypeOf('function');
    expect(Orion.OrionPriorityBadge).toBeTypeOf('function');
    expect(Orion.OrionPriceDisplay).toBeTypeOf('function');
    expect(Orion.OrionFormField).toBeTypeOf('function');
    expect(Orion.OrionTabs).toBeTypeOf('function');
    expect(Orion.OrionSection).toBeTypeOf('function');
    expect(Orion.OrionConfirmDialog).toBeTypeOf('function');
  });
});

describe('OrionPriorityBadge tones', () => {
  it('accepte les priorités métier', () => {
    expect(['Basse', 'Normale', 'Haute', 'Urgente']).toHaveLength(4);
  });
});
