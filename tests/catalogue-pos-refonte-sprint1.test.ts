import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isCatalogueArticleArchived,
  stripArchivedDisplayPrefix,
} from '@/lib/administration/catalogue-display-label';
import {
  CATALOG_STUDIOS,
  CATALOG_STUDIOS_VISIBLE,
  studioToDefaultTab,
  tabToStudio,
} from '@/components/admin/catalogue-prix-stock/CatalogStudioNav';

const root = process.cwd();

describe('catalogue POS refonte', () => {
  it('strips archived display prefixes', () => {
    expect(stripArchivedDisplayPrefix('[archivé→cv-fidelite] Carte de fidélité standard')).toBe(
      'Carte de fidélité standard',
    );
    expect(stripArchivedDisplayPrefix('Carte de visite')).toBe('Carte de visite');
    expect(isCatalogueArticleArchived({ articleLabel: '[archivé→x] Y', active: true })).toBe(true);
    expect(isCatalogueArticleArchived({ articleLabel: 'OK', active: false })).toBe(true);
    expect(isCatalogueArticleArchived({ articleLabel: 'OK', active: true, status: 'published' })).toBe(
      false,
    );
  });

  it('routes produits, chips et finitions under Formules & moteurs (Articles masqué)', () => {
    expect(tabToStudio('chips')).toBe('calculs');
    expect(tabToStudio('finitions')).toBe('calculs');
    expect(tabToStudio('articles')).toBe('calculs');
    expect(tabToStudio('anomalies')).toBe('matieres');
    expect(tabToStudio('engines')).toBe('calculs');
    expect(studioToDefaultTab('finitions')).toBe('chips');
    expect(studioToDefaultTab('calculs')).toBe('engines');
    expect(CATALOG_STUDIOS_VISIBLE).toHaveLength(2);
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).toEqual(['matieres', 'calculs']);
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('cockpit');
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('articles');
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('finitions');
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('prix');
    const fin = CATALOG_STUDIOS.find((s) => s.id === 'finitions');
    expect(fin?.hidden).toBe(true);
    expect(fin?.description).toMatch(/Alias/i);
    const cockpit = CATALOG_STUDIOS.find((s) => s.id === 'cockpit');
    expect(cockpit?.hidden).toBe(true);
    const excel = CATALOG_STUDIOS.find((s) => s.id === 'excel');
    expect(excel?.hidden).toBe(true);
    expect(CATALOG_STUDIOS.find((s) => s.id === 'prix')?.hidden).toBe(true);
  });

  it('Prix absorb options/finitions; anomalies under cockpit; no Catalogue nav', () => {
    const src = readFileSync(
      join(root, 'components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx'),
      'utf8',
    );
    expect(src).toMatch(/FINITIONS_SUBTABS/);
    expect(src).toMatch(/Bibliothèque options/);
    expect(src).toMatch(/canonicalizeStudio/);
    expect(src).toMatch(/finitions:\s*\["chips",\s*"finitions"\]/);
    expect(src).toMatch(/PricingArticlesWorkspace/);
    expect(src).not.toMatch(/ARTICLES_SUBTABS/);
  });

  it('unified catalogue hides archived by default and offers include toggle', () => {
    const ws = readFileSync(
      join(root, 'components/administration/catalogue/CataloguePosUnifiedWorkspace.tsx'),
      'utf8',
    );
    expect(ws).toMatch(/includeArchived/);
    expect(ws).not.toMatch(/options\/articles\?includeInactive=1['"`]/);
    expect(ws).toMatch(/includeArchived \? '\?includeInactive=1'/);

    const nav = readFileSync(
      join(root, 'components/administration/catalogue/CatalogueArticleNavigator.tsx'),
      'utf8',
    );
    expect(nav).toMatch(/Inclure les archivés/);
    expect(nav).toMatch(/stripArchivedDisplayPrefix/);
    expect(nav).toMatch(/isCatalogueArticleArchived/);
  });

  it('chips workspace uses Mode standard / Mode avancé', () => {
    const src = readFileSync(
      join(root, 'components/backoffice-v2/options/OptionsChipsWorkspace.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Mode standard/);
    expect(src).toMatch(/Mode avancé/);
    expect(src).toMatch(/orion-chips-column-mode/);
    expect(src).not.toMatch(/Vue essentielle/);
    expect(src).not.toMatch(/Vue avancée/);
  });

  it('legacy catalogue-pos redirect goes to prix/produits or prix chips or cockpit anomalies', () => {
    const page = readFileSync(
      join(root, 'app/(app)/administration/catalogue-pos/page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/studio',\s*'prix'/);
    expect(page).toMatch(/studio',\s*'cockpit'/);
    expect(page).not.toMatch(/studio',\s*'finitions'/);
    expect(page).toMatch(/sheet',\s*'options'/);
  });

  it('fiche produit unifiée under Prix with CSS wrapper', () => {
    const src = readFileSync(
      join(root, 'components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx'),
      'utf8',
    );
    expect(src).toMatch(/PricingArticlesWorkspace/);
    expect(src).toMatch(/legacyConfig/);
    expect(src).toMatch(/Fiche produit unifiée/);

    const ws = readFileSync(
      join(root, 'components/admin/pricing-v4/pricing-articles-workspace.tsx'),
      'utf8',
    );
    expect(ws).toMatch(/orion-pricing-admin/);
    expect(ws).toMatch(/pricing-admin\.css/);
  });

  it('catalog list defaults to dense list not chip soup', () => {
    const page = readFileSync(
      join(root, 'components/admin/pricing-v4/catalog/article-catalog-page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/useState<CatalogViewMode>\('list'\)/);
    expect(page).toMatch(/return 'list'/);
    expect(page).toMatch(/includeArchived/);
  });

  it('fiche produit embeds OptionsChipsWorkspace on options section', () => {
    const card = readFileSync(join(root, 'components/admin/article-pricing-card.tsx'), 'utf8');
    expect(card).toMatch(/OptionsChipsWorkspace/);
    expect(card).toMatch(/lockedArticleId/);
    expect(card).toMatch(/Options & finitions/);
  });

  it('audit matrix document exists', () => {
    const doc = readFileSync(join(root, 'docs/AUDIT_REFONTE_CATALOGUE_POS.md'), 'utf8');
    expect(doc).toMatch(/Fonction/);
    expect(doc).toMatch(/Bibliothèque options/);
    expect(doc).toMatch(/ProductOptionGroup/);
  });

  it('cockpit has no SHORTCUTS grid duplicating DOMAINES', () => {
    const src = readFileSync(
      join(root, 'components/admin/catalogue-prix-stock/CockpitStudio.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/const SHORTCUTS/);
    expect(src).toMatch(/File des priorités/);
    expect(src).toMatch(/priorities/);
  });
});
