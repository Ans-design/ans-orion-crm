/**
 * Liens réels GPAO 16 étapes ↔ modules ORION (pas des titres décoratifs).
 */

export type GpaoModuleLink = {
  href: string;
  label: string;
  moduleId: string;
};

/** Map étape dossier → module métier + deep link commande. */
export function resolveGpaoEtapeModuleLink(
  etapeNom: string,
  opts?: { commandeId?: string | null; devisId?: string | null; talkId?: string | null },
): GpaoModuleLink {
  const c = opts?.commandeId?.trim() || '';
  const cq = c ? encodeURIComponent(c) : '';
  const withCmd = (path: string, param = 'commande') =>
    cq ? `${path}${path.includes('?') ? '&' : '?'}${param}=${cq}` : path;

  const nom = etapeNom.trim().toLowerCase();

  if (nom.includes('commande reçue') || nom.includes('vérification dossier')) {
    return {
      moduleId: 'commandes',
      label: 'Commande',
      href: c ? `/commandes/${cq}` : '/commandes',
    };
  }
  if (nom.includes('fichier')) {
    return {
      moduleId: 'studio_fichiers',
      label: 'Fichiers studio',
      href: c ? `/commandes/${cq}?tab=bat` : '/studio/fichiers',
    };
  }
  if (nom.includes('préparation graphique') || nom.includes('preparation graphique')) {
    return {
      moduleId: 'studio_briefs',
      label: 'Studio / briefs',
      href: c ? `/commandes/${cq}?tab=bat` : '/studio',
    };
  }
  if (nom.includes('bat')) {
    return {
      moduleId: 'bat',
      label: 'BAT',
      href: c ? `/commandes/${cq}?tab=bat` : '/bat',
    };
  }
  if (nom.includes('planification')) {
    return {
      moduleId: 'planning',
      label: 'Planning Gantt',
      href: withCmd('/planning'),
    };
  }
  if (nom.includes('impression') || nom.includes('séchage') || nom.includes('sechage')) {
    return {
      moduleId: 'equipe_taches',
      label: 'Tâches impression',
      href: withCmd('/equipe/taches', 'commandeId'),
    };
  }
  if (nom.includes('façonnage') || nom.includes('faconnage')) {
    return {
      moduleId: 'equipe_taches',
      label: 'Tâches façonnage',
      href: withCmd('/equipe/taches', 'commandeId'),
    };
  }
  if (nom.includes('contrôle') || nom.includes('controle') || nom.includes('qualité') || nom.includes('qualite')) {
    return {
      moduleId: 'qualite',
      label: 'Contrôle qualité',
      href: withCmd('/production/qualite'),
    };
  }
  if (nom.includes('emballage') || nom.includes('prêt livraison') || nom.includes('pret livraison')) {
    return {
      moduleId: 'gpao_dossiers',
      label: 'Dossier GPAO',
      href: withCmd('/production/dossiers'),
    };
  }
  if (nom === 'livré' || nom.startsWith('livr')) {
    return {
      moduleId: 'livraisons',
      label: 'Livraisons',
      href: withCmd('/livraisons'),
    };
  }
  if (nom.includes('factur') || nom.includes('payé') || nom.includes('paye')) {
    return {
      moduleId: 'factures',
      label: 'Factures',
      href: withCmd('/factures'),
    };
  }
  if (nom.includes('archivé') || nom.includes('archive')) {
    return {
      moduleId: 'commandes',
      label: 'Commande',
      href: c ? `/commandes/${cq}` : '/commandes',
    };
  }

  return {
    moduleId: 'gpao_dossiers',
    label: 'Dossiers GPAO',
    href: withCmd('/production/dossiers'),
  };
}

/**
 * Deep-link sidebar : chaque module hub reçoit la commande active
 * (évite des titres « indicatifs » sans navigation métier).
 */
export function resolveSidebarModuleHrefForCommande(
  moduleId: string,
  baseHref: string,
  commandeId: string | null | undefined,
): string {
  const c = commandeId?.trim();
  if (!c) return baseHref;
  const cq = encodeURIComponent(c);

  switch (moduleId) {
    case 'commandes':
      return `/commandes/${cq}`;
    case 'devis':
      return baseHref;
    case 'gpao_dossiers':
      return `/production/dossiers?commande=${cq}`;
    case 'production':
      return `/production?commande=${cq}`;
    case 'planning':
      return `/planning?commande=${cq}`;
    case 'equipe_taches':
      return `/equipe/taches?commandeId=${cq}`;
    case 'qualite':
      return `/production/qualite?commande=${cq}`;
    case 'plan_matiere':
      return `/plan-matiere?commande=${cq}`;
    case 'bat':
    case 'studio_hub':
    case 'studio_briefs':
    case 'studio_fichiers':
    case 'conception':
    case 'prepresse':
      return `/commandes/${cq}?tab=bat`;
    case 'stock':
      return `/stock?commande=${cq}`;
    case 'livraisons':
      return `/livraisons?commande=${cq}`;
    case 'factures':
      return `/factures?commande=${cq}`;
    case 'paiements':
      return `/paiements?commande=${cq}`;
    case 'reclamations':
      return `/reclamations?commande=${cq}`;
    case 'messagerie':
    case 'ans_talk':
      return `/messagerie?commande=${cq}`;
    default: {
      if (!baseHref || baseHref === '#') return baseHref;
      if (/[?&]commande(Id)?=/.test(baseHref)) return baseHref;
      const sep = baseHref.includes('?') ? '&' : '?';
      return `${baseHref}${sep}commande=${cq}`;
    }
  }
}
