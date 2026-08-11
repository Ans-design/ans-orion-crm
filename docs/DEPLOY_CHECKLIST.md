# Checklist déploiement — ANS ORION

## Avant push

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm test` (Vitest — cible ≥ 1135 tests)
- [ ] `npm run audit:api-auth`
- [ ] `npm run ci:seed` puis `npm run verify:pos-prices` + `npm run sync:verify-drift`
- [ ] `npm run test:e2e` (local ou `test:e2e:prod` si changement critique)

## Configuration

- [ ] `.env.example` à jour
- [ ] `DATABASE_URL` configuré Hostinger
- [ ] `AUTH_SECRET` / `NEXTAUTH_SECRET` identiques
- [ ] `NEXTAUTH_URL` = URL prod
- [ ] `HOSTINGER_SITE_URL` = URL prod
- [ ] Aucun secret dans Git

## Déploiement

- [ ] Push `main` ou `npm run hostinger:redeploy:session`
- [ ] Build hPanel réussi (logs)
- [ ] `npm run hostinger:healthcheck`

## Smoke manuel

- [ ] `/api/health` → 200
- [ ] `/api/health/ready` → `{ ok: true, data.checks }`
- [ ] `/api/health/db` → connected
- [ ] Login admin
- [ ] Dashboard charge
- [ ] `/administration/vue-ensemble` (Backoffice)
- [ ] `/pos` catalogue
- [ ] Logs runtime sans erreur critique

## Rollback

- [ ] Commit stable identifié
- [ ] Redéploiement version précédente
- [ ] Healthcheck OK

## Diagnostic backoffice

Administration → Santé système → Réessayer si erreur
