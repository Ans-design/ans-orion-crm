# Critères pour revendiquer 10/10 — ANS ORION

**Statut actuel : NON ATTEINT** (voir note dans `reports/REMEDIATION_SUITE8_*.md`).

Un **10/10** n’est déclaré que si **tous** les points ci-dessous sont `OK` avec preuve.

| # | Critère | État |
|---|---------|------|
| 1 | Ledger + montants opérationnels + grilles Admin en `Int` MGA (local) | OK (suites 4–6) |
| 2 | Acompte = ledger uniquement | OK |
| 3 | STRICT_POS_PRICING forcé en prod | OK |
| 4 | Excel PRIX 2026 runtime fail-closed (legacy impossible en STRICT/prod) | OK (suite 7) |
| 5 | Pas d’écriture Excel → DB hors legacy | OK (suite 7) |
| 6 | PLV : pas de hardcode monétaire en STRICT sans override DB | OK (suite 8) |
| 7 | Finitions hardcode zéro en STRICT | OK |
| 8 | `smoke:finance` + vitest remédiation PASS | OK |
| 9 | E2E prod-smoke PASS | OK (suite 7) |
| 10 | E2E chaîne métier complète PASS | OK (suite 8 — 2/2 chromium) |
| 11 | Migration **Neon/Postgres prod** Float→Int exécutée + smoke | **BLOQUANT** — nécessite dump + `DATABASE_URL` prod |
| 12 | `npm audit` sans fail réseau / vulns critiques traitées | **souvent KO réseau** |
| 13 | Archives Excel absentes du bundle runtime | **volontairement conservées** (règle zéro suppression) — gated |

## Pourquoi pas 10/10 aujourd’hui

1. **Neon prod** non migré (hors capacité sans accès/credentials + validation humaine).  
2. **Archives Excel** encore dans le repo (fail-closed, non supprimées).  
3. Preuves E2E chaîne / audit registry à revalider à chaque passe.

## Comment atteindre 10/10

1. Exécuter `docs/POSTGRES_FIN01_MIGRATION.md` sur staging puis prod (snapshot obligatoire).  
2. Valider E2E chaîne + smoke post-migration.  
3. Décision produit : archives Excel = acceptées gated **ou** déplacement hors bundle build (sans supprimer le métier).  
4. `npm audit` + correctifs.

Tant que #11 n’est pas OK, la note plafonne **en dessous de 10**.
