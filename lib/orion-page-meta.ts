import { MODULE_REGISTRY } from '@/lib/modules/module-registry';
import { cpsMacroFromSearch } from '@/lib/administration/admin-macro-modules';

const EXTRA: Record<string, { title: string; section?: string }> = {
  '/dashboard': { title: 'Cockpit Principal', section: 'Workspace' },
  '/parametres': { title: 'Mon compte', section: 'Mon espace' },
  '/parametres/apparence': { title: 'Apparence', section: 'Mon espace' },
  '/parametres/notifications': { title: 'Notifications', section: 'Mon espace' },
  '/panier': { title: 'Panier', section: 'Ventes' },
  '/historique': { title: 'Historique', section: 'Administration' },
};

export function getOrionPageMeta(pathname: string) {
  const [pathOnly, query = ''] = pathname.split('?');
  const path = pathOnly ?? pathname;

  if (path === '/administration/catalogue-prix-stock') {
    const macro = cpsMacroFromSearch(query ? `?${query}` : '');
    return {
      title: macro === 'formules' ? 'Formules & moteurs' : 'Matières',
      section: 'Administration',
    };
  }

  if (EXTRA[path]) return EXTRA[path];

  const match = Object.values(MODULE_REGISTRY)
    .filter((m) => m.href && m.status !== 'hidden')
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))
    .find((m) => path === m.href || path.startsWith(`${m.href}/`));

  if (match) {
    const section = match.id.startsWith('ws_') ? 'Workspace' : match.group?.replace(/_/g, ' ') ?? 'Module';
    return { title: match.label, section: section.charAt(0).toUpperCase() + section.slice(1) };
  }

  const segment = path.split('/').filter(Boolean).pop() ?? 'Accueil';
  return {
    title: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    section: 'Workspace',
  };
}
