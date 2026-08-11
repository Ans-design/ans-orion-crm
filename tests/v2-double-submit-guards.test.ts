/**
 * V2-RC — gardes double-submit finance / achats / création modales.
 * Lecture source — aucune écriture DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('V2-RC — double-submit UI', () => {
  it('paiements : saving + loading footer', () => {
    const src = read('app/(app)/paiements/page.tsx');
    expect(src).toMatch(/if \(saving\) return/);
    expect(src).toMatch(/setSaving\(true\)/);
    expect(src).toMatch(/loading=\{saving\}/);
  });

  it('factures : saving + getApiErrorMessage email', () => {
    const src = read('app/(app)/factures/page.tsx');
    expect(src).toMatch(/if \(saving\) return/);
    expect(src).toMatch(/loading=\{saving\}/);
    expect(src).toMatch(/getApiErrorMessage\(data,/);
  });

  it('achats : receivingId désactive le bouton', () => {
    const src = read('app/(app)/achats/page.tsx');
    expect(src).toMatch(/if \(receivingId\) return/);
    expect(src).toMatch(/disabled=\{receivingId === o\.id\}/);
    expect(src).toMatch(/if \(saving\) return/);
    expect(src).toMatch(/disabled=\{saving\}/);
  });

  it('planning / fournisseurs : saving sur création', () => {
    expect(read('app/(app)/planning/page.tsx')).toMatch(/loading=\{saving\}/);
    expect(read('app/(app)/planning/page.tsx')).toMatch(/if \(saving\) return/);
    expect(read('app/(app)/fournisseurs/page.tsx')).toMatch(/if \(saving\) return/);
    expect(read('app/(app)/fournisseurs/page.tsx')).toMatch(/disabled=\{saving\}/);
  });

  it('kanban / workflow : getApiErrorMessage', () => {
    expect(read('components/commandes/commandes-kanban.tsx')).toMatch(/getApiErrorMessage\(d,/);
    expect(read('components/commandes/commande-workflow-stepper.tsx')).toMatch(/getApiErrorMessage\(d,/);
    expect(read('components/commandes/order-production-stepper.tsx')).toMatch(/getApiErrorMessage\(d,/);
  });

  it('livraisons / production : saving sur création', () => {
    expect(read('app/(app)/livraisons/page.tsx')).toMatch(/loading=\{saving\}/);
    expect(read('app/(app)/production/page.tsx')).toMatch(/loading=\{saving\}/);
  });

  it('planning : slots via unwrapListItems', () => {
    expect(read('app/(app)/planning/page.tsx')).toMatch(
      /setSlots\(unwrapListItems\(await sr\.json\(\)\)\)/,
    );
  });

  it('réception achat : claim En réception côté serveur', () => {
    const src = read('lib/services/purchase-order-service.ts');
    expect(src).toMatch(/statut: 'En réception'/);
    expect(src).toMatch(/updateMany/);
  });
});
