# Livrable — Renforcement ORION (architecture, design, données)

Date : 2026-06-27  
Production : https://darkorchid-badger-644294.hostingersite.com

## État déploiement

| Check | Statut |
|-------|--------|
| `/api/health` | OK — runtime hostinger |
| `/api/health/db` | OK — Neon Prisma ~89ms |
| Build local | OK |
| Tests | 572/572 |

## Fichiers créés / adaptés

### Design system

| Fichier | Action |
|---------|--------|
| `styles/design-tokens.css` | **Créé** — palette ORION, ombres, utilitaires |
| `lib/design/tokens.ts` | **Renforcé** — couleurs rose/cyan/violet alignées HTML v29 |
| `app/globals.css` | **Adapté** — import design-tokens |
| `lib/formatters.ts` | **Créé** — MGA, dates FR, réexport formatPrice |

### Architecture & navigation

| Fichier | Action |
|---------|--------|
| `ARCHITECTURE.md` | **Créé** — guide structure projet |
| `lib/navigation/route-aliases.ts` | **Créé** — alias menus HTML |
| `next.config.js` | **Adapté** — redirects /logs, /audit, /prix, /gpao… |
| `lib/modules/module-registry.ts` | **Adapté** — labels fusionnés (Prix & Tarifs, Historique & Audit) |
| `lib/modules/role-registry.ts` | **Adapté** — sections nav direction consolidées |

### Composants extraits

| Fichier | Action |
|---------|--------|
| `components/admin/production-status-panel.tsx` | **Créé** — extrait de admin-control (849→820 lignes) |
| `hooks/use-dashboard-stats.ts` | **Créé** — fetch dashboard avec timeout/états |

### Données dashboard (seed)

| Fichier | Action |
|---------|--------|
| `scripts/seed-dashboard-metrics.ts` | **Créé** — 3 devis, 2 factures, 7 paiements (CA 7 jours) |
| `scripts/seed.ts` | **Adapté** — appelle seedDashboardMetrics |
| `scripts/seed-incremental.ts` | **Adapté** — idem |

## Menus fusionnés (sans perte de routes)

| Avant | Après | Routes conservées |
|-------|-------|-------------------|
| Admin Prix + Hub config | **Prix & Tarifs** | `/tarifs`, `/admin-control` |
| Historique + Logs | **Historique & Audit** | `/historique` |
| Admin / Config / Backoffice | **Administration** | `/admin`, `/admin/vue`, `/admin-control` |
| Stock / Achats / Fournisseurs | **Stock & Approvisionnement** | routes inchangées |
| GPAO / Production | **Production** | `/production`, planning, machines |

## HTML v29 — éléments réutilisés vs ignorés

### Réutilisés (déjà intégrés avant ce renfort)

- Matricules comptes (`lib/orion-v29-accounts.ts`)
- Mapping 40/40 routes NAV (`lib/html-source-route-map.ts`)
- Profils rôles sidebar (`lib/modules/role-registry.ts`)
- KPI cards, empty/error states (`components/ui/`)
- Login premium (`app/login`)
- Sidebar + recherche globale (`orion-sidebar.tsx`, command palette)

### Extraits / renforcés dans ce livrable

- Palette rouge/rose/sombre ORION → design-tokens
- Labels sections nav HTML → role-registry
- Alias routes HTML → redirects Next.js

### Ignorés (volontairement)

- Monolithe HTML brut (JS global, CSS inline géant)
- Données hardcodées inline HTML (→ seed PostgreSQL)
- Duplication POS/devis (modules développeurs préservés)
- Gantt/Kanban HTML pur non converti (pages `/production`, `/planning` Next.js existantes utilisées)

## POS — préservé

Aucune modification des configurateurs, chips, catégories ou parcours POS.  
Sync prix : `npm run sync:pos-prices` (Excel requis dans `data/`).

## Composants UI existants (61 fichiers)

Design system déjà en place via `components/ui/` + `app-ui.ts` :
Button, Card, Table, Modal, Badge, Tabs, Input, Skeleton, EmptyState, ErrorState, ConfirmDialog, KpiCard…

## Tests & liens

```bash
npm run test
npm run hostinger:healthcheck
```

| URL | Test |
|-----|------|
| https://darkorchid-badger-644294.hostingersite.com/login | Connexion |
| /dashboard | KPIs post-seed |
| /admin | Hub backoffice |
| /pos | Catalogue intact |
| /panier | Session + sync |

Comptes : `ADMIN_EMAIL` / `<ADMIN_PASSWORD>` · matricules via `ORION_V29_PASSWORDS_JSON` (env)

## Prochaines phases recommandées

1. `npm run seed:incremental` sur Neon (paiements dashboard)
2. Import Excel POS → `sync:pos-prices`
3. Découpage progressif `admin-control/page.tsx` (onglets → fichiers)
4. Conversion composants HTML restants (Gantt, Kanban) module par module
