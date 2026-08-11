# Checklist validation manuelle RC — ANS ORION

| Date | 2026-07-19 (Vague Finale) |
|------|--------------------------|
| Environnement | Staging recommandé (pas prod) |

## Avant démarrage

- [ ] Backup PG restaurable testé sur instance jetable — **MANQUANT** (bloque GO PROD + repair)
- [ ] Variables hPanel : `DATABASE_URL` postgres, `NEXTAUTH_SECRET` ≥32, `DEMO_MODE=false`, `ALLOW_SETUP_DB` absent — **NON EXÉCUTÉ**
- [x] `npm run typecheck` OK — **VÉRIFIÉ** Vague Finale
- [x] Tests smoke A→F + RC Auth + VF-QA01 — **VÉRIFIÉ** (53 + 15)
- [x] Build Next local — **VÉRIFIÉ** `npx next build` exit 0 (2026-07-19)

## Auth

- [x] Routes critiques écriture sans escalade `config:view` — **VÉRIFIÉ**
- [x] Routes `/api/*` métier protégées ou allowlistées — **387 routes**
- [x] Démo : pas d’écritures finance/stock/production/admin — **VÉRIFIÉ**
- [x] Rôle lecture : permissions d’import/écriture refusées — **VÉRIFIÉ**
- [ ] Non connecté → refus HTTP effectif sur staging — **manuel staging**

## Prix / POS

- [x] Canon `calculatePrice` + golden — **VÉRIFIÉ**
- [x] `getPosCatalogue` sans merges au read — **VÉRIFIÉ** VF-P0B + VF-QA01
- [ ] Article publié visible POS — **manuel**
- [ ] Même config → même PU (POS vs simulate admin) — **manuel**
- [ ] Brouillon non publié absent POS — **manuel**
- [ ] Panier → devis : snapshot figé — **manuel**
- [ ] Après publication : lancer sync POS (maintenance catalogue) — **manuel**

## Stock / finance

- [x] Vente directe refuse stock insuffisant — **VÉRIFIÉ**
- [x] Idempotence / TX adjust — **VÉRIFIÉ**
- [x] PUT devis statut Accepté → 409 — **VÉRIFIÉ**
- [x] Paiement référence idempotente — **VÉRIFIÉ**
- [x] Release réservation sur Annulée — **VÉRIFIÉ**
- [x] Ledger `Paiement` = vérité ; `Commande.acompte/reste` dérivés — **documenté**
- [ ] Clôture caisse : totaux cohérents session — **manuel**
- [ ] Payment drift `CMD-2024-013` résolu — **BLOQUÉ** D-012

## Admin sync

- [ ] Publier + sync → POS à jour — **manuel / E2E isolé NON EXÉCUTÉ**
- [x] Centre sync / drift visible — **VÉRIFIÉ** (1 drift RO)
- [x] Sync-pos appelle `runPosCatalogueMaintenance` — **VÉRIFIÉ code**

## Hostinger (staging)

- [ ] `build:hostinger` OK — **NON EXÉCUTÉ**
- [ ] `/api/health` + `/api/health/db` OK — **NON EXÉCUTÉ**
- [ ] Login admin réel — **NON EXÉCUTÉ**
- [x] `setup-db` fail-closed sans `ALLOW_SETUP_DB` — **VÉRIFIÉ**
- [x] `db push --accept-data-loss` build prod fail-closed — **VÉRIFIÉ VF-P0A**

## UX

- [x] Radius 7px (tokens + Tailwind) — **VÉRIFIÉ**
- [x] ANS Talk badge → `/messagerie` — **VÉRIFIÉ**
- [ ] Recette 320–1440 + clavier — **manuel**

## Sign-off

| Rôle | Nom | Date | GO STAGING / NO-GO |
|------|-----|------|---------------------|
| Propriétaire | | | |
| Technique | | | |

**Production :** uniquement si backup + toutes cases staging OK + décision écrite.

## Preuves auto Vague Finale

| Contrôle | Résultat |
|----------|----------|
| typecheck | exit 0 |
| A→F + RC Auth | 53 OK |
| VF-QA01 | 15 OK |
| Audit Auth API | 387 routes OK |
| `npx next build` | exit 0 — 2026-07-19 |
