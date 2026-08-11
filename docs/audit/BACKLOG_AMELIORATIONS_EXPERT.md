# Backlog améliorations expert — Vague Finale

| Date | 2026-07-19 |
|------|------------|
| Règle | Appliquer seulement si sûr, non destructif, testable |

## Appliqué (Vague Finale)

| Idée | Décision | Preuve |
|------|----------|--------|
| Fail-closed data-loss build | Appliqué | VF-P0A |
| Catalogue POS lecture pure | Appliqué | VF-P0B |
| Preuves comportementales | Appliqué | VF-QA01 |
| Radius 7px | Appliqué | VF-P1 |
| Nav rôle `finance` | Appliqué | VF-P1 |

## Proposer / différer (validation humaine)

| Idée | Priorité | Risque | Décision |
|------|----------|--------|----------|
| Unifier overrides DB → `hasPermission` API | P1 | Moyen | Attendre D-007 |
| Scoping commercial horizontal | P1 | Métier | Attendre D-006 |
| E2E axe login/dashboard/POS/commande | P2 | Faible | Staging isolé |
| Mesures p50/p95 réelles | P2 | Faible | Staging |
| Concurrence Prisma double TX stock/devis | P1 | Moyen | DB jetable |
| 2FA / CSP stricte | P2 | Moyen | Lot 8 |
| Variables tarification 100 % DB | P2 | Moyen | Lot 3 |
| Empreinte Git officielle | P2 | Process | D-001 |
| Supprimer artefacts env `deploy/hostinger` des packages | P0 | Sécu | Humain (ne pas logger secrets) |

## Interdit sans GO

- Repair payment drift, migrate prod, seed réel, Hostinger `--prod`, automatisations C01–C06.
