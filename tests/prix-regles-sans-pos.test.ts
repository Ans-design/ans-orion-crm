import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRODUCT_SHEET_TABS_VISIBLE } from '@/lib/administration/product-sheet';
import { ARTICLE_CONFIG_TABS } from '@/lib/pricing/pricing-admin-ui';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';

const root = process.cwd();

function src(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Prix & règles — sans POS / publication / matières dupliquées', () => {
  it('fiche article visible tabs exclude POS and matières autonome', () => {
    const labels = PRODUCT_SHEET_TABS_VISIBLE.map((t) => t.label).join('|');
    expect(labels).not.toMatch(/Apparence POS|Options POS|Matières et formats/);
    expect(ARTICLE_CONFIG_TABS.map((t) => t.id)).not.toContain('apparence-pos');
    expect(ARTICLE_CONFIG_TABS.map((t) => t.id)).not.toContain('matieres-formats');
  });

  it('admin vocab no longer says Publier / Dépublier / Tarif publié / Brouillon', () => {
    expect(ADMIN_UI.publish).not.toBe('Publier');
    expect(ADMIN_UI.unpublish).not.toBe('Dépublier');
    expect(ADMIN_UI.status.tariffPublished).not.toMatch(/publié/i);
    expect(ADMIN_UI.status.draft).not.toBe('Brouillon');
  });

  it('pricing UI surfaces drop Options POS and Apparence POS strings', () => {
    const card = src('components/admin/article-pricing-card.tsx');
    expect(card).not.toMatch(/Options POS/);
    expect(card).toMatch(/Options & finitions/);
    expect(card).toMatch(/Gérer dans Options & finitions/);
    expect(card).toMatch(/Tester dans Studio Prix/);
    expect(card).toMatch(/Validation tarifaire/);
    expect(card).toMatch(/Ouvrir la matière/);

    const families = src('components/admin/catalogue-prix-stock/PricingStudioNav.tsx');
    expect(families).toMatch(/Formules & règles|Formules & moteurs/);
    expect(families).toMatch(/Options & finitions|Paliers|moteurs/i);
    // Simulation peut être aliasé / masqué — présence domaine calculs suffit
    expect(families).toMatch(/Simulation|calculs|Formules/i);

    // Refonte "Tarifs par article" : colonne POS = interrupteur d'activation (voulu),
    // mais les anciennes chaînes "Visible POS" / "Options POS" restent bannies.
    const dense = src('components/admin/pricing-v4/catalog/article-dense-list.tsx');
    expect(dense).not.toMatch(/Visible POS/);
    expect(dense).toMatch(/au POS/);
    expect(dense).toMatch(/Validation|tarif|Type/i);

    const chips = src('components/backoffice-v2/options/ChipsDataTable.tsx');
    expect(chips).not.toMatch(/Visible POS/);
    expect(chips).not.toMatch(/Ordre POS/);
    expect(chips).toMatch(/Utilisation/);
    expect(chips).toMatch(/optionUsageLabel/);
  });

  it('product sheet opens as center modal not side drawer', () => {
    const css = src('components/admin/pricing-v4/pricing-admin.css');
    expect(css).toMatch(/acat-detail-drawer__dialog/);
    expect(css).toMatch(/max-height:\s*88vh/);
    expect(css).not.toMatch(/transform:\s*translateX\(100%\)/);
  });

  it('materials in formula are read-only from prix fiche', () => {
    const card = src('components/admin/article-pricing-card.tsx');
    expect(card).toMatch(/canEdit=\{false\}/);
    expect(card).toMatch(/Matières, formats & stock/);
  });
});
