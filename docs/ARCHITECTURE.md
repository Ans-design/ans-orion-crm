# ANS ORION — Architecture

## Résumé

ANS ORION est le CRM/GPAO/POS de **ANS DESIGN PRINT** (Madagascar) : ventes, devis, commandes, production, stock, finance, RH et backoffice de configuration tarifaire.

**Stack :** Next.js 14 (App Router), TypeScript, Prisma, NextAuth, Tailwind, Playwright/Vitest.

**Production :** Node.js Web App sur Hostinger → https://darkorchid-badger-644294.hostingersite.com  
**Base prod :** PostgreSQL (Neon), pas MySQL (voir `docs/DATABASE.md`).

## Architecture cible

```
Navigateur (React)
    ↓ fetch
API Routes (app/api/**)
    ↓
Services métier (lib/services/**)
    ↓
Prisma (lib/prisma.ts)
    ↓
PostgreSQL / SQLite (dev)
```

**Sources de vérité (ordre de priorité) :**

1. **Base Prisma** — profils tarifaires, commandes, clients, stock, RH, messages
2. **SystemConfig / admin-config** — brouillon publié (chips, visibilité POS, variables)
3. **lib/data/** — catalogue structurel, seeds, fallbacks (migration progressive vers DB)

## Modules principaux

| Domaine | Routes | Services clés |
|---------|--------|-----------------|
| Pilotage | `/dashboard`, `/cockpit` | `dashboard-slices.ts`, `dashboard-stats.ts` |
| Ventes & POS | `/pos`, `/panier` | `catalogue-service.ts`, `cart-service.ts` |
| CRM | `/clients`, `/devis` | `devis-accept-service.ts`, `client-detail.ts` |
| Commande hub | `/commandes/[id]` | `commande-360-service.ts`, `commande-workflow-service.ts` |
| GPAO | `/production`, `/planning` | `gpao-dossier-service.ts`, `planning-commande-service.ts` |
| Stock | `/stock`, `/achats` | `stock-service.ts`, `stock-reservation-service.ts` |
| Finance | `/factures`, `/finance` | `facture-workflow-service.ts`, `finance-adv-service.ts` |
| RH | `/rh/*` | `rh-service.ts`, `payroll-service.ts` |
| Communication | `/messagerie` | `lib/messaging/messaging-service.ts` |
| Administration | `/administration/*` | `backoffice-article-service.ts`, `admin-config.ts` |

## Backoffice

Module unifié `/administration/:section` — shell léger, onglets lazy-loaded.  
Voir `docs/BACKOFFICE.md`.

## Hub commande

Tout converge vers `/commandes/[id]` : BAT, production, livraison, facture, ANS Talk, fichiers.

## Règles métier transverses

- **Grand format** : dimensions en **cm**, surfaces en m²
- **Petit format** : dimensions en **mm**
- **Matière et grammage** : champs séparés
- **Backoffice** configure ; **POS/Devis** consomment via API
- **Zéro suppression** de fonctionnalités existantes (regrouper, masquer, rediriger)

## Sécurité (phase rectification)

- NextAuth session, `requirePermission` / `requireAdmin` sur APIs
- Sécurité avancée (2FA, rate limit strict) → version finale

## Déploiement

Voir `docs/HOSTINGER.md`, `docs/HOSTINGER_DEPLOYMENT.md`, `docs/DEPLOY_CHECKLIST.md`.

## Documents liés

- `docs/API.md` — catalogue endpoints
- `docs/WORKFLOWS.md` — flux métier
- `docs/PERFORMANCE.md` — optimisations
- `docs/ROADMAP_EXECUTION.md` — plan par lots
