import { describe, expect, it } from 'vitest';
import { resolveBackofficeRedirect, LEGACY_ADMIN_SECTIONS } from '@/lib/administration/backoffice-redirects';
import { ADMINISTRATION_SECTIONS, sectionToTab } from '@/lib/administration/routes';

describe('Aperçus POS — aperçu local', () => {
  it('ne redirige plus /administration/apercus vers le studio chips', () => {
    expect(resolveBackofficeRedirect('apercus')).toBeNull();
    expect(LEGACY_ADMIN_SECTIONS.has('apercus')).toBe(true);
  });

  it('mappe la section apercus vers l’onglet apercus', () => {
    expect(ADMINISTRATION_SECTIONS.apercus.tab).toBe('apercus');
    expect(sectionToTab('apercus')).toBe('apercus');
  });
});
