import { describe, expect, it } from 'vitest';
import { ADMIN_MACRO_MODULES } from '@/lib/administration/admin-macro-modules';

function allHrefs(): string[] {
  return ADMIN_MACRO_MODULES.flatMap((m) =>
    m.microItems.filter((i) => !i.hidden).map((i) => i.href.split('?')[0] ?? i.href),
  );
}

describe('Admin nav discoverability (V2 G1/G2)', () => {
  it('Variables est visible dans les macros', () => {
    const hrefs = allHrefs();
    expect(hrefs).toContain('/administration/variables');
  });

  it('Synchronisation est visible dans les macros', () => {
    const hrefs = allHrefs();
    expect(hrefs).toContain('/administration/synchronisation');
  });

  it('Aperçus POS est visible', () => {
    expect(allHrefs()).toContain('/administration/apercus');
  });

  it("Modèles d'articles est visible dans Formules", () => {
    expect(allHrefs()).toContain('/administration/modeles-articles');
  });
});
