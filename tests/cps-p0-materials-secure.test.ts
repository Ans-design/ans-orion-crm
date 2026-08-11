import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

function src(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('CPS P0 — matières sécurisées', () => {
  it('patchBaseMaterial force draft et non published sur édition de contenu', () => {
    const repo = src('lib/server/modules/pricing/base-material.repository.ts');
    expect(repo).toMatch(/publicationStatus = 'draft'/);
    expect(repo).toMatch(/Édition de contenu sans statut explicite/);
    expect(repo).toMatch(/Jamais forcer published/);
  });

  it('DELETE matière archive (soft-delete) sans delete physique', () => {
    const route = src('app/api/admin-backoffice/pricing/base-materials/[id]/route.ts');
    expect(route).toMatch(/archiveBaseMaterial/);
    expect(route).toMatch(/soft-delete/);
    expect(route).not.toMatch(/deleteBaseMaterialIfUnused/);
    const repo = src('lib/server/modules/pricing/base-material.repository.ts');
    expect(repo).toMatch(/Zéro suppression physique/);
    // delete Prisma uniquement via purgeArchivedBaseMaterial (corbeille)
    expect(repo).toMatch(/purgeArchivedBaseMaterial/);
  });

  it('import UI n’active pas replaceAll par défaut', () => {
    const table = src('components/backoffice-v2/pricing-custom/BaseMaterialPricesTable.tsx');
    expect(table).toMatch(/replaceAll:\s*false/);
    const svc = src('lib/server/modules/materials/materials-excel-import.service.ts');
    expect(svc).toMatch(/replaceAll === true/);
  });

  it('liaison stock est transactionnelle', () => {
    const link = src('lib/server/modules/stock/stock-material-link.service.ts');
    expect(link).toMatch(/\$transaction/);
    expect(link).toMatch(/Liaison matière ↔ stock atomique/);
  });

  it('drawer vérifie la réponse publish avant toast succès', () => {
    const drawer = src(
      'components/backoffice-v2/pricing-custom/material-prices/MaterialSheet.tsx',
    );
    expect(drawer).toMatch(/publication échouée/);
    expect(drawer).toMatch(/pr\.ok/);
  });
});
