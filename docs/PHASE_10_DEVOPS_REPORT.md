# Phase 10 — DevOps / release

**Date :** 2026-07-07  
**Statut :** Intégré  
**Périmètre :** Orchestrateur release local, checklist déploiement, smoke E2E étendu.

---

## Objectif

Automatiser la chaîne de vérification pré-déploiement et documenter les contrôles post-release (health, smoke modules GPAO/finance).

---

## Script `scripts/release-orion.mjs`

Pipeline séquentiel :

| Étape | Commande |
|-------|----------|
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests unitaires | `npm test` |
| Audit auth API | `npm run audit:api-auth` |
| Build prod | `npm run build` (sauf `--skip-build`) |
| Smoke E2E | `npm run test:e2e:smoke` (sauf `--skip-e2e`) |

```bash
node scripts/release-orion.mjs
node scripts/release-orion.mjs --skip-build   # rapide, sans build
node scripts/release-orion.mjs --skip-e2e     # sans Playwright
```

En cas d'échec, le script s'arrête avec le code de sortie de l'étape fautive.

---

## Checklist déploiement

`docs/DEPLOY_CHECKLIST.md` — ajout du contrôle **`/api/health/ready`** (readiness avec `data.checks`).

---

## Smoke E2E (Phase 8)

`e2e/smoke-orion.spec.ts` couvre désormais :

- Modules commerciaux : dashboard, clients, POS, panier, devis, commandes, stock
- Modules GPAO / finance : production, machines, paiements, factures, livraisons, rapports
- Backoffice data : `/administration/data-management`
- API readiness : `GET /api/health/ready`

Lancer : `npm run test:e2e:smoke` (auth via `e2e/auth.setup.ts`).

---

## Déploiement Hostinger

Après pipeline locale OK :

1. `npm run hostinger:redeploy:session` ou push `main`
2. `npm run hostinger:healthcheck`
3. Smoke manuel checklist (login, POS, backoffice)

Voir `scripts/hostinger-orchestrate.mjs` pour l'orchestration API Hostinger complète.

---

## Package.json (recommandé)

Ajouter si besoin :

```json
"release:orion": "node scripts/release-orion.mjs"
```
