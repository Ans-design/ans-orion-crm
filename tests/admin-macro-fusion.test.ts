import { describe, expect, it } from 'vitest';
import {
  ADMIN_MACRO_MODULES,
  cpsMacroFromSearch,
  macroHubUrl,
  macroForModule,
  resolveMacroAlias,
  resolveMacroNavActive,
} from '@/lib/administration/admin-macro-modules';

describe('sidebar Administration — Matières + Formules & moteurs', () => {
  it('expose 7 macros visibles (CPS scindé + Articles + Temps)', () => {
    expect(ADMIN_MACRO_MODULES).toHaveLength(7);
    expect(ADMIN_MACRO_MODULES.map((m) => m.id)).toEqual([
      'overview',
      'matieres',
      'prix-articles',
      'formules',
      'production',
      'temps',
      'org',
    ]);
  });

  it('n’affiche plus Catalogue POS ni Catalogue, Prix & Stock fusionné', () => {
    const labels = ADMIN_MACRO_MODULES.map((m) => m.label);
    expect(labels).toContain('Matières');
    expect(labels).toContain('Formules & moteurs');
    expect(labels).toContain('Temps & capacités');
    expect(labels).not.toContain('Catalogue, Prix & Stock');
    expect(labels).not.toContain('Catalogue POS');
    expect(labels).not.toContain('Base Prix, Matières & Stock');
  });

  it('hub Temps & capacités pointe vers estimation-temps', () => {
    expect(macroHubUrl('temps')).toBe('/administration/estimation-temps');
    expect(
      resolveMacroNavActive('/administration/estimation-temps', '')?.macroId,
    ).toBe('temps');
  });

  it('hub Organisation pointe vers roles-permissions (canonique)', () => {
    expect(macroHubUrl('org')).toBe('/administration/roles-permissions');
  });

  it('hubs matières / formules / alias pointent vers CPS', () => {
    expect(macroHubUrl('matieres')).toBe('/administration/catalogue-prix-stock?studio=matieres');
    expect(macroHubUrl('formules')).toBe(
      '/administration/catalogue-prix-stock?studio=calculs&tab=engines',
    );
    expect(macroHubUrl('catalog')).toBe('/administration/catalogue-prix-stock?studio=matieres');
    expect(macroHubUrl('prices')).toBe('/administration/catalogue-prix-stock?studio=matieres');
    expect(macroHubUrl('stock')).toBe('/administration/catalogue-prix-stock?studio=matieres');
  });

  it('alias prices/stock/catalog → matieres', () => {
    expect(resolveMacroAlias('prices')).toBe('matieres');
    expect(resolveMacroAlias('stock')).toBe('matieres');
    expect(resolveMacroAlias('catalog')).toBe('matieres');
  });

  it('mappe stock → matieres, pricing/catalogue → formules', () => {
    expect(macroForModule('stock')).toBe('matieres');
    expect(macroForModule('pricing')).toBe('formules');
    expect(macroForModule('catalogue')).toBe('formules');
  });

  it('mappe audit/settings vers org', () => {
    expect(macroForModule('audit')).toBe('org');
    expect(macroForModule('settings')).toBe('org');
  });

  it('cpsMacroFromSearch distingue matières et formules', () => {
    expect(cpsMacroFromSearch('studio=matieres')).toBe('matieres');
    expect(cpsMacroFromSearch('studio=calculs&tab=engines')).toBe('formules');
    expect(cpsMacroFromSearch('')).toBe('matieres');
  });

  it('resolveMacroNavActive highlighte la bonne entrée CPS', () => {
    expect(
      resolveMacroNavActive(
        '/administration/catalogue-prix-stock',
        'studio=matieres',
      )?.macroId,
    ).toBe('matieres');
    expect(
      resolveMacroNavActive(
        '/administration/catalogue-prix-stock',
        'studio=calculs&tab=engines',
      )?.macroId,
    ).toBe('formules');
  });
});
