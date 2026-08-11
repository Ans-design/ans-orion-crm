import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  bumpLiveRevisions,
  getLiveRevisionsSnapshot,
} from '@/lib/server/live/live-revision-bus';
import {
  buildCommandeUniverseFlowSteps,
  isUniverseStepComplete,
} from '@/lib/commande/commande-universe-flow';
import { ENTITY_DATA_COMPLIANCE } from '@/lib/crm/entity-data-compliance';
import { getEntityExcelModule } from '@/lib/crm/entity-excel-modules';

describe('ORION 10/10 — checklist code', () => {
  it('toutes les entités compliance ont export + trash définis', () => {
    for (const row of ENTITY_DATA_COMPLIANCE) {
      expect(row.export).toBe(true);
      expect(row.trash).toBe(true);
      const mod = getEntityExcelModule(row.id);
      expect(mod).toBeTruthy();
      if (!row.import) expect(mod?.allowImport).toBe(false);
    }
  });

  it('univers: aucun faux « fait » stock/BAT/finance', () => {
    const steps = buildCommandeUniverseFlowSteps({
      commandeId: 'c1',
      statut: 'Prête',
      reste: 1,
      hasBatPending: true,
      hasLivraison: false,
      hasFacture: false,
    });
    expect(steps.find((s) => s.id === 'studio')?.state).not.toBe('done');
    expect(steps.find((s) => s.id === 'finance')?.state).not.toBe('done');
    expect(isUniverseStepComplete('stock', {
      commandeId: 'c1',
      statut: 'En attente stock',
      reste: 0,
    })).toBe(false);
  });

  it('live revision multi-postes incrémente', () => {
    const a = bumpLiveRevisions(['factures']);
    const b = bumpLiveRevisions(['paiements', 'caisse']);
    expect(b).toBeGreaterThan(a);
    expect(getLiveRevisionsSnapshot(['factures', 'paiements']).max).toBe(b);
  });

  it('toolbar a aria-label Données module (source)', () => {
    const src = readFileSync(
      join(process.cwd(), 'components/ui/entity-data-toolbar.tsx'),
      'utf8',
    );
    expect(src).toContain('aria-label="Données module"');
    expect(src).toContain('aria-pressed');
    expect(src).toContain('min-h-11');
  });

  it('shell liste a role=region + aria-labelledby', () => {
    const src = readFileSync(
      join(process.cwd(), 'components/ui/entity-list-page-shell.tsx'),
      'utf8',
    );
    expect(src).toContain('role="region"');
    expect(src).toContain('aria-labelledby');
  });
});
