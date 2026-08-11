/** État actif nav — évite double surbrillance Catalogue + Conception */
export function isNavItemActive(
  pathname: string | null | undefined,
  href: string,
  search?: string | null,
): boolean {
  if (!pathname) return false;

  const [hrefPath, hrefQueryStr] = href.split('?');
  const hrefParams = hrefQueryStr ? new URLSearchParams(hrefQueryStr) : null;
  const currentParams = search ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search) : null;

  /* Studio — hub /studio?tab=* + aliases /studio/briefs|fichiers|prepresse */
  const studioHrefTab = resolveStudioHrefTab(hrefPath, hrefParams);
  if (studioHrefTab) {
    const currentTab = resolveStudioCurrentTab(pathname, currentParams);
    return currentTab === studioHrefTab;
  }
  /* Hub nu /studio : jamais actif si un onglet dédié existe dans la nav */
  if ((hrefPath === '/studio' || hrefPath === '/studio/') && !hrefParams?.get('tab')) {
    return false;
  }

  if (hrefPath === '/pos') {
    return pathname === '/pos' || (pathname.startsWith('/pos/') && !pathname.startsWith('/pos/conception'));
  }
  if (hrefPath === '/pos/conception') {
    return pathname.startsWith('/pos/conception');
  }

  /* ANS Talk — canon `/messagerie` + aliases legacy */
  const talkAliases = new Set([
    '/messagerie',
    '/ans-talk',
    '/chat',
    '/communication/ans-talk',
    '/equipe/messages',
  ]);
  if (hrefPath === '/messagerie' || talkAliases.has(hrefPath)) {
    return talkAliases.has(pathname) || pathname.startsWith('/messagerie/');
  }

  if (hrefPath === '/admin/pricing') {
    if (pathname !== '/admin/pricing') return false;
    const currentTab = currentParams?.get('tab') ?? 'sante';
    const wantTab = hrefParams?.get('tab') ?? 'sante';
    return currentTab === wantTab;
  }

  if (hrefPath.startsWith('/administration')) {
    if (!pathname.startsWith('/administration')) return false;
    if (hrefPath === '/administration/vue-ensemble' || hrefPath === '/administration') {
      return pathname === '/administration'
        || pathname === '/administration/vue-ensemble'
        || pathname === '/administration/sante-systeme'
        || pathname.startsWith('/administration/sante')
        || (pathname === '/administration/backoffice' && (currentParams?.get('macro') === 'overview' || currentParams?.get('tab') === 'overview'));
    }
    return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  }

  if (pathname.startsWith('/administration') && hrefPath === '/admin/pricing') {
    return true;
  }

  if (pathname !== hrefPath && !pathname.startsWith(`${hrefPath}/`)) return false;

  if (hrefParams && currentParams) {
    for (const [key, value] of hrefParams.entries()) {
      if (currentParams.get(key) !== value) return false;
    }
  }

  return true;
}

/** Onglet attendu pour un lien Studio (path alias ou ?tab=). */
function resolveStudioHrefTab(
  hrefPath: string,
  hrefParams: URLSearchParams | null,
): 'briefs' | 'fichiers' | 'prepresse' | null {
  if (hrefPath === '/studio/briefs' || hrefPath.startsWith('/studio/briefs/')) return 'briefs';
  if (hrefPath === '/studio/fichiers' || hrefPath.startsWith('/studio/fichiers/')) return 'fichiers';
  if (hrefPath === '/studio/prepresse' || hrefPath.startsWith('/studio/prepresse/')) return 'prepresse';
  if (hrefPath === '/studio' || hrefPath === '/studio/') {
    const tab = hrefParams?.get('tab');
    if (tab === 'briefs' || tab === 'fichiers' || tab === 'prepresse') return tab;
    return null;
  }
  return null;
}

/** Onglet Studio courant (après redirect alias → /studio?tab=). */
function resolveStudioCurrentTab(
  pathname: string,
  currentParams: URLSearchParams | null,
): 'briefs' | 'fichiers' | 'prepresse' | null {
  if (pathname.startsWith('/studio/briefs')) return 'briefs';
  if (pathname.startsWith('/studio/fichiers')) return 'fichiers';
  if (pathname.startsWith('/studio/prepresse')) return 'prepresse';
  if (pathname === '/studio' || pathname === '/studio/') {
    const tab = currentParams?.get('tab');
    if (tab === 'fichiers' || tab === 'prepresse' || tab === 'briefs') return tab;
    return 'briefs';
  }
  return null;
}
