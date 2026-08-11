type DashboardKpis = {
  devisEnAttente: number;
  tauxConversion: number;
  dossiersBloques: number;
  cmdRetard: number;
  batEnAttente: number;
  stockCritique: number;
  impayesClients: number;
  margeReellePct: number;
  rhRetards: number;
  tachesBloquees: number;
  livraisonsEnCours: number;
};

export type DomainHealth = {
  id: string;
  label: string;
  score: number;
  status: 'ok' | 'warn' | 'alert';
  hint: string;
};

export type EnterpriseHealth = {
  globalScore: number;
  globalStatus: 'ok' | 'warn' | 'alert';
  summary: string;
  domains: DomainHealth[];
};

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusFromScore(score: number): 'ok' | 'warn' | 'alert' {
  if (score >= 75) return 'ok';
  if (score >= 50) return 'warn';
  return 'alert';
}

/** Score santé entreprise — jamais « ok » si qualité PARTIAL/ERROR/NO_DATA (V13 P0-27). */
export function computeEnterpriseHealth(
  kpis: DashboardKpis,
  opts?: { quality?: 'FRESH' | 'PARTIAL' | 'ERROR' | 'NO_DATA' | 'STALE' },
): EnterpriseHealth {
  const quality = opts?.quality ?? 'FRESH';
  if (quality === 'ERROR' || quality === 'NO_DATA') {
    return {
      globalScore: 0,
      globalStatus: 'alert',
      summary: 'Score santé indisponible — données absentes ou en erreur.',
      domains: [],
    };
  }

  const commercial = clampScore(
    100
    - (kpis.devisEnAttente > 10 ? 15 : kpis.devisEnAttente > 5 ? 8 : 0)
    - (kpis.tauxConversion < 30 ? 20 : kpis.tauxConversion < 50 ? 10 : 0),
  );

  const production = clampScore(
    100
    - (kpis.dossiersBloques > 0 ? Math.min(30, kpis.dossiersBloques * 8) : 0)
    - (kpis.cmdRetard > 0 ? Math.min(25, kpis.cmdRetard * 5) : 0)
    - (kpis.batEnAttente > 5 ? 10 : 0),
  );

  const stock = clampScore(100 - (kpis.stockCritique > 0 ? Math.min(40, kpis.stockCritique * 6) : 0));

  const finance = clampScore(
    100
    - (kpis.impayesClients > 0 ? Math.min(35, Math.log10(kpis.impayesClients + 1) * 8) : 0)
    - (kpis.margeReellePct < 20 ? 15 : 0),
  );

  const rh = clampScore(
    100
    - (kpis.rhRetards > 3 ? 15 : kpis.rhRetards > 0 ? 5 : 0)
    - (kpis.tachesBloquees > 0 ? Math.min(20, kpis.tachesBloquees * 5) : 0),
  );

  const delivery = clampScore(
    100 - (kpis.livraisonsEnCours > 15 ? 10 : 0) - (kpis.cmdRetard > 0 ? 15 : 0),
  );

  const domains: DomainHealth[] = [
    {
      id: 'commercial',
      label: 'Commercial',
      score: commercial,
      status: statusFromScore(commercial),
      hint: kpis.devisEnAttente > 0 ? `${kpis.devisEnAttente} devis en attente` : 'Pipeline fluide',
    },
    {
      id: 'production',
      label: 'Production',
      score: production,
      status: statusFromScore(production),
      hint: kpis.dossiersBloques > 0 ? `${kpis.dossiersBloques} dossier(s) bloqué(s)` : 'Atelier sous contrôle',
    },
    {
      id: 'stock',
      label: 'Stock',
      score: stock,
      status: statusFromScore(stock),
      hint: kpis.stockCritique > 0 ? `${kpis.stockCritique} alerte(s) stock` : 'Stocks OK',
    },
    {
      id: 'finance',
      label: 'Finance',
      score: finance,
      status: statusFromScore(finance),
      hint: kpis.impayesClients > 0 ? 'Impayés à surveiller' : 'Trésorerie saine',
    },
    {
      id: 'rh',
      label: 'RH',
      score: rh,
      status: statusFromScore(rh),
      hint: kpis.rhRetards > 0 ? `${kpis.rhRetards} retard(s)` : 'Équipe présente',
    },
    {
      id: 'delivery',
      label: 'Livraison',
      score: delivery,
      status: statusFromScore(delivery),
      hint: kpis.livraisonsEnCours > 0 ? `${kpis.livraisonsEnCours} en cours` : 'Logistique calme',
    },
  ];

  const globalScore = clampScore(
    domains.reduce((s, d) => s + d.score, 0) / domains.length,
  );

  let globalStatus = statusFromScore(globalScore);
  if (quality === 'PARTIAL' || quality === 'STALE') {
    if (globalStatus === 'ok') globalStatus = 'warn';
  }

  const alerts = domains.filter((d) => d.status !== 'ok');
  const summary =
    quality === 'PARTIAL' || quality === 'STALE'
      ? `Données ${quality.toLowerCase()} — score non certifié vert.`
      : alerts.length === 0
        ? 'Tous les indicateurs sont dans le vert.'
        : `Attention : ${alerts.map((a) => a.label.toLowerCase()).join(', ')}.`;

  return {
    globalScore,
    globalStatus,
    summary,
    domains,
  };
}
