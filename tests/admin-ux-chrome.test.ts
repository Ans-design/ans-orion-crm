import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';
import { CATALOG_STUDIOS, CATALOG_STUDIOS_VISIBLE } from '@/components/admin/catalogue-prix-stock/CatalogStudioNav';
import { filterColumnsByBreakpoint } from '@/lib/backoffice/material-table-columns';
import { MASTER_DATA_MATERIAL_COLUMNS } from '@/components/backoffice-v2/ui/MasterDataVirtualTable';

describe('admin UX chrome', () => {
  it('keeps a stable vocabulary for critical actions', () => {
    expect(ADMIN_UI.publish).toBe('Activer');
    expect(ADMIN_UI.save).toBe('Enregistrer');
    expect(ADMIN_UI.archive).toBe('Archiver');
    expect(ADMIN_UI.deletePermanent).toBe('Supprimer définitivement');
    expect(ADMIN_UI.status.tariffPublished).toBe('Version tarifaire active');
    expect(ADMIN_UI.status.draft).toBe('À corriger');
    expect(ADMIN_UI.unpublish).toBe('Archiver');
  });

  it('exposes domaines CPS visibles — Matières · Formules&moteurs (Articles masqué alias)', () => {
    expect(CATALOG_STUDIOS).toHaveLength(9);
    expect(CATALOG_STUDIOS_VISIBLE).toHaveLength(2);
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).toEqual([
      'matieres',
      'calculs',
    ]);
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('cockpit');
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('excel');
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('articles');
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('prix');
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('finitions');
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('anomalies');
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('historique');
  });

  it('macro nav active state uses brand red, not pink', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    const block = css.match(/\.orion-admin-macro-nav-item\.is-active\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(block).toMatch(/--app-primary|#FF174D/);
    expect(block).not.toMatch(/#ec4899/);
  });

  it('CPS CSS respects reduced motion and Gemini/ORION chrome', () => {
    const css = readFileSync(
      join(process.cwd(), 'components/admin/catalogue-prix-stock/catalogue-prix-stock-light.css'),
      'utf8',
    );
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/--cps-radius:\s*7px/);
    expect(css).toMatch(/Charte Gemini/);
    expect(css).toMatch(/shadow-sm/);
  });

  it('prix studio uses ARTICLES_PILLS not PricingStudioNav stack', () => {
    const src = readFileSync(
      join(process.cwd(), 'components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx'),
      'utf8',
    );
    expect(src).toMatch(/ARTICLES_PILLS/);
    expect(src).toMatch(/PricingCalculsStudio/);
    expect(src).not.toMatch(/PricingStudioNav/);
  });

  it('product sheet sticky chrome exposes quick price actions', () => {
    const src = readFileSync(join(process.cwd(), 'components/admin/article-pricing-card.tsx'), 'utf8');
    expect(src).toMatch(/pta-sticky-actions/);
    expect(src).toMatch(/Modifier le prix/i);
    expect(src).toMatch(/beforeunload/);
    expect(src).toMatch(/AdminEmptyState/);
  });

  it('catalog supports deep-link sheet=paliers', () => {
    const page = readFileSync(
      join(process.cwd(), 'components/admin/pricing-v4/catalog/article-catalog-page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/sheetSection/);
    expect(page).toMatch(/initialSection/);
  });

  it('admin layout no longer uses pink #ec4899 accents', () => {
    const css = readFileSync(
      join(process.cwd(), 'components/backoffice-v2/admin-backoffice-layout.css'),
      'utf8',
    );
    expect(css).not.toMatch(/#ec4899/i);
    expect(css).not.toMatch(/236,\s*72,\s*153/);
  });

  it('SmartDataGrid supports priority columns for responsive hide', () => {
    const src = readFileSync(
      join(process.cwd(), 'components/admin/catalogue-prix-stock/SmartDataGrid.tsx'),
      'utf8',
    );
    expect(src).toMatch(/priority\?:/);
    expect(src).toMatch(/cps-col-priority-low/);
    expect(src).toMatch(/data-density/);
  });

  it('price grids wire SmartColumn priority on real columns', () => {
    const ds = readFileSync(
      join(process.cwd(), 'components/administration/direct-sale/PriceTableWorkspace.tsx'),
      'utf8',
    );
    expect(ds).toMatch(/priority:\s*'high'/);
    expect(ds).toMatch(/priority:\s*'low'/);

    const ctx = readFileSync(
      join(process.cwd(), 'components/administration/prix-matieres-stock/PrixMatieresStockWorkspace.tsx'),
      'utf8',
    );
    expect(ctx).toMatch(/priority:\s*'high'/);
    expect(ctx).toMatch(/priority:\s*'low'/);
  });

  it('catalog chips expose selected check indicator', () => {
    const chip = readFileSync(
      join(process.cwd(), 'components/admin/pricing-v4/catalog/article-compact-chip-grid.tsx'),
      'utf8',
    );
    expect(chip).toMatch(/acat-chip-check/);
    expect(chip).toMatch(/aria-selected/);
  });

  it('chips table hides secondary columns by data-col on small screens', () => {
    const css = readFileSync(
      join(process.cwd(), 'components/backoffice-v2/admin-backoffice.css'),
      'utf8',
    );
    expect(css).toMatch(/data-col='source'/);
    expect(css).toMatch(/data-col='bloc'/);
    expect(css).toMatch(/max-width:\s*1023px/);
  });

  it('material columns declare responsive priority', () => {
    const src = readFileSync(
      join(process.cwd(), 'components/backoffice-v2/ui/MasterDataVirtualTable.tsx'),
      'utf8',
    );
    expect(src).toMatch(/priority:\s*'high'/);
    expect(src).toMatch(/priority:\s*'low'/);
    const cols = readFileSync(
      join(process.cwd(), 'lib/backoffice/material-table-columns.ts'),
      'utf8',
    );
    expect(cols).toMatch(/filterColumnsByBreakpoint/);

    const md = filterColumnsByBreakpoint(MASTER_DATA_MATERIAL_COLUMNS, 'md');
    expect(md.some((c) => c.id === 'otherDetails')).toBe(false);
    const sm = filterColumnsByBreakpoint(MASTER_DATA_MATERIAL_COLUMNS, 'sm');
    expect(sm.every((c) => (c.priority ?? 'high') === 'high')).toBe(true);
    expect(sm.map((c) => c.id)).toContain('material');
    expect(sm.map((c) => c.id)).toContain('actions');
  });

  it('catalog leave-without-save uses ConfirmDialog when sheet dirty', () => {
    const page = readFileSync(
      join(process.cwd(), 'components/admin/pricing-v4/catalog/article-catalog-page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/ConfirmDialog/);
    expect(page).toMatch(/sheetDirty/);
    expect(page).toMatch(/leaveWithoutSave|unsavedChangesTitle/);
    expect(page).toMatch(/onDirtyChange/);
    expect(ADMIN_UI.leaveWithoutSave).toBe('Quitter sans enregistrer');
  });

  it('a11y contracts — listbox/option, sticky toolbar, search label', () => {
    const chips = readFileSync(
      join(process.cwd(), 'components/admin/pricing-v4/catalog/article-compact-chip-grid.tsx'),
      'utf8',
    );
    expect(chips).toMatch(/role="listbox"/);
    expect(chips).toMatch(/role="option"/);
    expect(chips).toMatch(/aria-label="Articles — vue chips"/);

    // Refonte "Tarifs par article" : la liste dense est désormais une vraie table sémantique.
    const dense = readFileSync(
      join(process.cwd(), 'components/admin/pricing-v4/catalog/article-dense-list.tsx'),
      'utf8',
    );
    expect(dense).toMatch(/<table className="acat-dense-table">/);
    expect(dense).toMatch(/aria-label="Articles & tarifs"/);
    expect(dense).toMatch(/data-priority="high"/);

    const card = readFileSync(
      join(process.cwd(), 'components/admin/article-pricing-card.tsx'),
      'utf8',
    );
    expect(card).toMatch(/aria-label="Actions rapides prix"/);
    expect(card).toMatch(/role="toolbar"/);

    const grid = readFileSync(
      join(process.cwd(), 'components/admin/catalogue-prix-stock/SmartDataGrid.tsx'),
      'utf8',
    );
    expect(grid).toMatch(/aria-label=\{searchPlaceholder\}/);
    expect(grid).toMatch(/aria-sort=/);
  });
});
