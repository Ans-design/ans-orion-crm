# Backoffice — Rapport final (vague 1)

## Livré le 2026-07-05

### Nouvelle organisation

- Route **`/administration/backoffice`** — hub unifié Catalogue & Tarification
- Alias **`/backoffice`** → nouvelle route (plus vue-ensemble)
- Menu sidebar **Backoffice** pointe vers `/administration/backoffice`
- Layout 3 colonnes + header global (recherche, filtres, publish, sync, anomalies)

### Composants créés

| Fichier | Rôle |
|---------|------|
| `BackofficeCatalogShell.tsx` | Orchestrateur page |
| `BackofficeHeader.tsx` | Titre, filtres, actions globales |
| `BackofficeArticleSidebar.tsx` | Liste catalogue |
| `BackofficeArticleEditor.tsx` | 6 onglets unifiés |
| `BackofficeContextPanel.tsx` | Panneau droit contextuel |
| `backoffice-catalog.css` | Styles (radius 7px design system) |

### Services & APIs

| API | Statut |
|-----|--------|
| `GET /api/backoffice/catalog` | Créé (+ sync embarqué) |
| `GET /api/backoffice/anomalies` | Créé |
| `POST /api/backoffice/pricing/simulate` | Créé |
| `POST /api/backoffice/publish` | Créé |
| `POST /api/backoffice/sync` | Créé |
| `GET /api/backoffice/audit-log` | Créé |
| Articles existants `/api/backoffice/articles/*` | Conservés |

Modules : `backoffice.service`, `backoffice-anomaly.service`, `backoffice-sync.service`, `pricing-simulator.service`.

### Modifications existantes

- `ArticlePricingCard` : sections contrôlées depuis shell (`activeSection`, `hideSectionNav`)
- `backoffice-workspace.tsx` : rendu shell quand section = `backoffice`
- `lib/administration/routes.ts` : section `backoffice`
- `lib/pricing/backoffice-unified-tabs.ts` : constantes 6 onglets

### Tests

- `npx tsc --noEmit` : OK
- Build complet : relancer après arrêt `dev:local` (lock Prisma)

### Risques restants

- Grille prix matière/format pas encore unifiée en table unique (utilise éditeurs inline existants)
- Table variables éditable inline à renforcer
- Historique audit global, pas encore filtré par article dans l’UI

### Prochaines améliorations

1. Deep-link anomalie → onglet concerné + scroll
2. Dupliquer / désactiver article depuis onglet Général
3. Tests Playwright parcours admin (20 scénarios prompt §16)
4. Fusion progressive des sections legacy vers le hub (sans suppression)

### Validation partielle prompt

| Critère | Statut |
|---------|--------|
| Interface plus simple | ✅ Hub unique |
| Menus réduits dans hub | ✅ 6 onglets vs 12 sections internes |
| Données DB réelles | ✅ |
| Sync POS visible | ✅ Header + onglet sync |
| POS / panier / devis intact | ✅ Aucune route supprimée |
| Build OK | ⏳ À confirmer sans lock dev |
