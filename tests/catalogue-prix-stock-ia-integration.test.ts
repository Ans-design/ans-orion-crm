import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CATALOG_STUDIOS,
  CATALOG_STUDIOS_VISIBLE,
  canonicalizeStudio,
  tabToStudio,
} from '@/components/admin/catalogue-prix-stock/CatalogStudioNav';
import { PRICING_STUDIO_SECTIONS_VISIBLE } from '@/components/admin/catalogue-prix-stock/PricingStudioNav';
import { MASTER_DATA_MATERIAL_COLUMNS } from '@/components/backoffice-v2/ui/MasterDataVirtualTable';
import { MATERIAL_COLUMN_PRESETS } from '@/lib/backoffice/material-table-columns';

const root = process.cwd();

describe('refonte Catalogue Prix Stock — 3 piliers', () => {
  it('exposes domaines visibles : Matières · Formules & moteurs (Articles masqué)', () => {
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).toEqual([
      'matieres',
      'calculs',
    ]);
    const labels = CATALOG_STUDIOS_VISIBLE.map((s) => s.label).join(' ');
    expect(labels).toMatch(/Matières/);
    expect(labels).toMatch(/Formules/);
    expect(CATALOG_STUDIOS.find((s) => s.id === 'prix')?.hidden).toBe(true);
  });

  it('routes tabs to the two pillars (+ aliases calculs)', () => {
    expect(tabToStudio('chips')).toBe('calculs');
    expect(tabToStudio('finitions')).toBe('calculs');
    expect(tabToStudio('paliers')).toBe('calculs');
    expect(tabToStudio('engines')).toBe('calculs');
    expect(tabToStudio('regles')).toBe('calculs');
    expect(tabToStudio('isf')).toBe('calculs');
    expect(tabToStudio('anomalies')).toBe('matieres');
    expect(tabToStudio('prix-contexte')).toBe('matieres');
    expect(tabToStudio('stock')).toBe('matieres');
    expect(canonicalizeStudio('engines')).toBe('calculs');
    expect(canonicalizeStudio('formulas')).toBe('calculs');
    expect(canonicalizeStudio('prix')).toBe('calculs');
  });

  it('hides PricingStudioNav sections (nav domaines only)', () => {
    expect(PRICING_STUDIO_SECTIONS_VISIBLE).toHaveLength(0);
  });

  it('fuses CPS cockpit into sidebar Vue d’ensemble without replacing Admin overview', () => {
    const page = readFileSync(
      join(root, 'app/(app)/administration/vue-ensemble/page.tsx'),
      'utf8',
    );
    const overview = readFileSync(
      join(root, 'components/administration/overview/OverviewUnifiedWorkspace.tsx'),
      'utf8',
    );
    const host = readFileSync(
      join(root, 'components/administration/overview/CatalogueCockpitHost.tsx'),
      'utf8',
    );
    const workspace = readFileSync(
      join(root, 'components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx'),
      'utf8',
    );
    expect(page).toMatch(/OverviewUnifiedWorkspace/);
    expect(page).not.toMatch(/showSupervision/);
    expect(overview).toMatch(/CatalogueCockpitHost/);
    expect(overview).toMatch(/orion-overview-cps-fuse/);
    expect(host).toMatch(/CockpitStudio/);
    expect(workspace).toMatch(/\/administration\/vue-ensemble/);
    expect(workspace).toMatch(/isCockpitOverview/);
  });

  it('fuses engines + paliers + formulas into PricingCalculsStudio', () => {
    const calculs = readFileSync(
      join(root, 'components/admin/catalogue-prix-stock/PricingCalculsStudio.tsx'),
      'utf8',
    );
    const workspace = readFileSync(
      join(root, 'components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx'),
      'utf8',
    );
    const fm = readFileSync(
      join(root, 'components/admin/catalogue-prix-stock/FormulesMoteursWorkspace.tsx'),
      'utf8',
    );
    const gallery = readFileSync(
      join(root, 'components/admin/catalogue-prix-stock/PricingEnginesGallery.tsx'),
      'utf8',
    );
    expect(calculs).toMatch(/FormulesMoteursWorkspace/);
    expect(fm).toMatch(/matchFmEngineByFamily/);
    expect(fm).toMatch(/ArticleTierTable/);
    expect(fm).toMatch(/FormulaEditorCore|Paliers/);
    expect(workspace).toMatch(/PricingCalculsStudio/);
    expect(gallery).not.toMatch(/Formules & règles/);
    expect(gallery).toMatch(/hidden: true/);
  });

  it('articles paliers moved to Formules & moteurs (Articles domain hidden)', () => {
    const nav = readFileSync(
      join(root, 'components/admin/catalogue-prix-stock/CatalogStudioNav.tsx'),
      'utf8',
    );
    expect(nav).toMatch(/id: 'prix'/);
    expect(nav).toMatch(/hidden: true/);
    expect(CATALOG_STUDIOS_VISIBLE.map((s) => s.id)).not.toContain('prix');
  });

  it('unified materials grid columns match maquette (achat / vierge / imprimé / stock)', () => {
    const ids = MASTER_DATA_MATERIAL_COLUMNS.map((c) => c.id);
    expect(ids).toContain('purchase');
    expect(ids).toContain('blank');
    expect(ids).toContain('price');
    expect(ids).toContain('stock');
    expect(MATERIAL_COLUMN_PRESETS.unified.hiddenIds).not.toContain('purchase');
    expect(MATERIAL_COLUMN_PRESETS.costs.hiddenIds).not.toContain('purchase');
    expect(MATERIAL_COLUMN_PRESETS.stock.hiddenIds).not.toContain('stock');
  });

  it('matieres studio shows single master table (no PillTabs)', () => {
    const studio = readFileSync(
      join(root, 'components/admin/catalogue-prix-stock/MaterialStockStudio.tsx'),
      'utf8',
    );
    expect(studio).not.toMatch(/from ['"]\.\/PillTabs['"]/);
    expect(studio).not.toMatch(/CpsStudioFrame/);
    expect(studio).toMatch(/columnPreset="master"/);
    expect(studio).toMatch(/MaterialsUnifiedWorkspace/);
    const workspace = readFileSync(
      join(root, 'components/administration/catalogue-prix-stock/CataloguePrixStockWorkspace.tsx'),
      'utf8',
    );
    // Titre domaine Matières (libellé évolutif — présence hub matières)
    expect(workspace).toMatch(/Matières/);
    expect(workspace).toMatch(/matiere|matière/i);
  });

  it('cockpit priority queue replaces shortcut DOMAINES cards', () => {
    const cockpit = readFileSync(
      join(root, 'components/admin/catalogue-prix-stock/CockpitStudio.tsx'),
      'utf8',
    );
    expect(cockpit).toMatch(/File des priorités/);
    expect(cockpit).toMatch(/cps-prio-table/);
    expect(cockpit).not.toMatch(/const SHORTCUTS/);
  });

  it('audit + reference sources are versioned in docs', () => {
    expect(readFileSync(join(root, 'docs/AUDIT_REFONTE_CATALOGUE_PRIX_STOCK_IA.md'), 'utf8')).toMatch(
      /5 domaines/,
    );
    expect(
      readFileSync(join(root, 'docs/references/orion_catalogue_stock_refondu.html'), 'utf8'),
    ).toMatch(/Matières & formats/);
  });

  it('MaterialStatusBadge prefers Actif over Brouillon/Publié', () => {
    const cells = readFileSync(
      join(root, 'components/backoffice-v2/pricing-custom/material-prices/MaterialTableCells.tsx'),
      'utf8',
    );
    expect(cells).toMatch(/>Actif</);
    expect(cells).not.toMatch(/>Brouillon</);
    expect(cells).not.toMatch(/>Publié</);
  });

  it('virtualizes material rows beyond the operational threshold', () => {
    const table = readFileSync(
      join(root, 'components/backoffice-v2/ui/MasterDataVirtualTable.tsx'),
      'utf8',
    );
    expect(table).toMatch(/items\.length > 60/);
    expect(table).toMatch(/visibleItems/);
    expect(table).toMatch(/data-rendered-rows/);
  });
});
