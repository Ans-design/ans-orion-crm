# Architecture ANS ORION CRM V3

## Principes

- **Next.js App Router** — pages dans `app/`, API dans `app/api/`
- **Pas de monolithe** — composants < 400 lignes, services séparés des routes
- **POS intact** — logique catalogue/chips dans `lib/pos/`, `lib/admin-config/`, `components/pos/`
- **Données réelles** — KPIs depuis Prisma/seed, pas de chiffres hardcodés dans les composants

## Arborescence

```
app/                    Routes & pages (App Router)
  (app)/                Layout authentifié + modules métier
  api/                  Endpoints REST (try/catch, permissions, timeout)
components/
  ui/                   Design system (Button, Card, EmptyState, KpiCard…)
  layout/               Sidebar, header, shell
  admin/                Panneaux backoffice
  dashboard/            Cockpit direction
  pos/                  Catalogue POS (ne pas refactoriser brutalement)
hooks/                  useCart, useDashboardStats, useToast…
lib/
  design/               Tokens ORION (tokens.ts, status-meta.ts)
  formatters.ts         Dates, montants MGA
  navigation/           Alias routes, labels menus fusionnés
  modules/              Registre modules + profils rôles HTML v29
  services/             Logique métier (dashboard-stats, cart-service…)
  prisma.ts             Client DB lazy
styles/
  design-tokens.css     Variables CSS ORION
scripts/                Seed, deploy Hostinger, maintenance
types/                  Types partagés (si extraits)
```

## Design system

| Source | Rôle |
|--------|------|
| `styles/design-tokens.css` | Variables CSS (--orion-red, ombres, utilitaires) |
| `lib/design/tokens.ts` | Tokens JS pour composants React |
| `components/ui/app-ui.ts` | Exports unifiés App* |
| `components/layouts/page-header.tsx` | En-tête page standard |

## Navigation fusionnée

| Module fusionné | Routes |
|-----------------|--------|
| Prix & Tarifs | `/tarifs`, `/admin-control` |
| Historique & Audit | `/historique` (+ alias `/logs`, `/audit`) |
| Administration | `/admin`, `/admin/vue`, `/admin-control` |
| Stock & Approvisionnement | `/stock`, `/achats`, `/fournisseurs` |
| Production | `/production`, `/planning`, `/machines` |

Redirections : `next.config.js` → `redirects()`

## Backend — contrat API

1. `requireAuth` / `requirePermission` / `requireAdmin`
2. `withTimeout` sur requêtes Prisma lourdes
3. `emptyDashboardStats` / fallbacks 200 si DB lente
4. `/api/health` sans Prisma · `/api/health/db` avec fallback pg

## Seed production

```bash
npm run seed:production      # Complet
npm run seed:incremental     # v29 users + audit + dashboard metrics
```

Modules seed : clients, commandes, devis, factures, paiements (CA dashboard), employés v29, audit.

## Hostinger

- Build : `npm run build:hostinger`
- Prestart : client Prisma PostgreSQL automatique
- Health : `npm run hostinger:healthcheck`
