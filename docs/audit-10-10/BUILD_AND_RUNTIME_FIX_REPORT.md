# Build & Runtime — Rapport Vague 1

**Date :** 2026-07-06  
**Objectif :** Stabilité technique sans crash build/dev.

## Résultats commandes

| Commande | Statut | Notes |
|---|---|---|
| `npm run typecheck` | ✅ OK | 0 erreur TS |
| `npx prisma validate` | ✅ OK | Schema valide |
| `npx prisma generate` | ✅ OK | Après `taskkill node` + suppression `.prisma` lock |
| `npm run build` | ✅ OK | Next.js 14 build complet |
| `npm run test` | ✅ OK | 205 fichiers, 1154 tests |
| `npm run dev` | ✅ OK | Port 3020 après clean |

## Problèmes connus corrigés / contournés

### P0 — EPERM Prisma sur Windows

- **Fichiers :** `node_modules/.prisma/client/query_engine-windows.dll.node`
- **Cause :** Processus `node.exe` / dev server verrouille le DLL Prisma
- **Impact :** `prisma generate` et `npm run build` échouent
- **Correction :** `taskkill /F /T /IM node.exe` puis `Remove-Item node_modules\.prisma` + régénérer
- **Script :** `npm run dev:local:clean`, `scripts/dev-clean.mjs`
- **Test :** `npx prisma generate && npm run build`

### P0 — Chunks Next 404 / HTML brut

- **Fichiers :** `.next/`, `scripts/ensure-dev-next.mjs`
- **Cause :** Cache `.next` corrompu (BUILD_ID manquant)
- **Impact :** Pages en HTML brut, chunks 404
- **Correction :** Supprimer `.next`, relancer `dev:local:clean`
- **Test :** Navigation `/dashboard`, `/stock`, `/administration/backoffice`

### P1 — Test publish-bulk 500

- **Fichier :** `tests/admin-backoffice-api.test.ts`
- **Cause :** Route appelle `publishBaseMaterialsPricing` non mockée
- **Correction :** Mock ajouté pour `pricing-publication.service`
- **Test :** `npm run test -- tests/admin-backoffice-api.test.ts`

## Critères Phase 1

| Critère | Statut |
|---|---|
| Build OK | ✅ |
| Typecheck OK | ✅ |
| Prisma OK | ✅ |
| Pas d'API critique 500 non gérée (tests API) | ✅ |
| Dev démarre sans écran blanc | ✅ (après clean) |

## Procédure locale recommandée

```powershell
taskkill /F /T /IM node.exe 2>$null
Remove-Item -Recurse -Force .next, node_modules\.prisma -ErrorAction SilentlyContinue
npx prisma generate
npm run build
npm run dev:local
```
