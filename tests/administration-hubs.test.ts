import { describe, expect, it } from 'vitest';
import { listAdministrationHubNav, listAdministrationHubs } from '@/lib/administration/routes';

describe('listAdministrationHubs', () => {
  it('expose 11 hubs', () => {
    expect(listAdministrationHubs()).toHaveLength(11);
  });

  it('génère des liens vers la page Matières unifiée', () => {
    const nav = listAdministrationHubNav();
    const matieres = nav.flatMap((h) => h.items).find((i) => i.slug === 'matieres');
    expect(matieres?.href).toBe('/administration/matieres');
  });

  it('redirige catalogue et options vers le hub Catalogue Prix & Stock', () => {
    const nav = listAdministrationHubNav();
    const items = nav.flatMap((h) => h.items);
    expect(items.find((i) => i.slug === 'catalogue')?.href).toBe(
      '/administration/catalogue-prix-stock?tab=catalogue&studio=chips',
    );
    expect(items.find((i) => i.slug === 'options')?.href).toBe(
      '/administration/catalogue-prix-stock?tab=catalogue&studio=chips',
    );
  });
});
