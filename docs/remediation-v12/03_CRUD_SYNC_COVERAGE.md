# V12 — Couverture CRUD / sync (extrait)

Source machine : `artifacts/remediation-v12/crud-sync-coverage.json`  
Généré : 2026-08-02 · 222 routes mutantes / 398 fichiers API.

## Légende colonnes (cible)

method/path · module · entité · opération · permission · TX · version · idempotency · audit · outbox · projections · statut

## Synthèse

| Métrique | Valeur | Statut |
|----------|--------|--------|
| Mutations inventoriées | 222 | PASS (SYNC001 inventaire) |
| TX dans fichier route | 2 | FAIL — à compléter via services |
| Outbox dans fichier route | 0 | FAIL |
| Audit hint | 60 | PARTIAL |
| Idempotency hint | 1 | FAIL |
| Hard-delete hint | 10 | WARN — matrice retention Lot 8 |

## Règle CI (cible)

Toute nouvelle mutation critique absente du JSON doit faire échouer le pipeline (schéma à brancher Lot 9).

Les lignes détaillées sont dans le JSON (évite un MD de 200+ pages). Enrichissement progressif : colonnes `ownerEntity`, `eventType`, `testId` au fur et à mesure des lots.
