export type RoleWelcomeInput = {
  role?: string | null;
  userName?: string | null;
  devisEnAttente?: number;
  batEnAttente?: number;
  cmdAPlanifier?: number;
  cmdActives?: number;
  caDay?: number;
  impayesClients?: number;
  dossiersBloques?: number;
};

export type RoleWelcome = {
  greeting: string;
  message: string;
  shortcuts: { label: string; href: string }[];
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Direction',
  manager: 'Direction',
  commercial: 'Commercial',
  production: 'Production',
  designer: 'Graphiste',
  livraison: 'Livraison',
  caisse: 'Caisse',
  demo: 'Démo',
  lecture: 'Consultation',
};

function firstName(name?: string | null) {
  const n = name?.trim().split(/\s+/)[0];
  return n || 'équipe';
}

export function buildRoleWelcome(input: RoleWelcomeInput): RoleWelcome {
  const role = input.role ?? 'user';
  const label = ROLE_LABELS[role] ?? 'ORION';
  const greeting = `Bonjour ${firstName(input.userName)} — ${label}`;

  if (role === 'commercial' || role === 'demo') {
    const n = input.devisEnAttente ?? 0;
    return {
      greeting,
      message: n > 0 ? `${n} devis à relancer aujourd'hui.` : 'Pipeline commercial à jour — bonne journée.',
      shortcuts: [
        { label: 'Nouveau devis', href: '/pos' },
        { label: 'Devis en attente', href: '/devis' },
        { label: 'Clients', href: '/clients' },
      ],
    };
  }

  if (role === 'designer') {
    const n = input.batEnAttente ?? 0;
    return {
      greeting,
      message: n > 0 ? `${n} BAT attendent votre correction.` : 'Studio à jour — aucun BAT urgent.',
      shortcuts: [
        { label: 'BAT', href: '/bat' },
        { label: 'Studio', href: '/studio' },
        { label: 'Fichiers', href: '/studio?tab=fichiers' },
      ],
    };
  }

  if (role === 'production') {
    const n = (input.cmdActives ?? 0) + (input.cmdAPlanifier ?? 0);
    return {
      greeting,
      message: n > 0 ? `${n} commandes sont prêtes ou en cours d'impression.` : 'Atelier calme — vérifiez le planning.',
      shortcuts: [
        { label: 'Production', href: '/production' },
        { label: 'Dossiers GPAO', href: '/production/dossiers' },
        { label: 'Planning', href: '/planning' },
      ],
    };
  }

  if (role === 'admin' || role === 'manager') {
    return {
      greeting,
      message: `CA du jour, impayés et production disponibles dans le cockpit.`,
      shortcuts: [
        { label: 'Rapports', href: '/rapports' },
        { label: 'Commandes', href: '/commandes' },
        { label: 'Backoffice', href: '/administration/vue-ensemble' },
      ],
    };
  }

  return {
    greeting,
    message: input.dossiersBloques ? `${input.dossiersBloques} dossier(s) bloqué(s) à surveiller.` : 'Bienvenue sur ANS ORION.',
    shortcuts: [
      { label: 'Mon espace', href: '/dashboard' },
      { label: 'Messagerie', href: '/messagerie' },
      { label: 'Aide', href: '/aide' },
    ],
  };
}
