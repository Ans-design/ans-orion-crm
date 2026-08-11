# REMEDIATION V4 — Checkpoint final (Lots A–F)

Date : 2026-07-30  
**Score 10/10 non déclaré** — e2e smoke / build complet à valider après `dev:stop` + generate.

## Lots couverts

| Lot | État global | Preuves clés |
|-----|-------------|--------------|
| A Sécurité | FIXED | public-routes, payroll, strip reports, cm/finance perms, tests lot-a |
| B Flux | FIXED (B7–B8 ok) | BAT→GPAO, prépresse, SAV commandeId, Livré→facture, `/devis/[id]`, next-action canon |
| C Prix/POS | PARTIEL FIXED | pricing-engine-contract, cart version, livres tests existants, scripts dev OK ; POS page toujours large |
| D Perf | FIXED majeurs | stock paginé + suggest, GPAO page, reports aggregates, achats autocomplete, planning 40, FAB |
| E Prod/Stock | FIXED majeurs | sync-drift stock/BAT, qualité via étape GPAO, BaseMaterial picker, SYNC_MATRIX E1 |
| F UI/legacy | PARTIEL | aide compteur API, preuve livraison, COMMANDE_ACTIONS deprecated ; F1/F2 découpage clients non fait |

## Docs

- `REMEDIATION_V4_TRACEABILITY.md`
- `REMEDIATION_V4_PERFORMANCE.md`
- `REMEDIATION_V4_CHECKPOINT.md` (ce fichier)
- `docs/SYNC_MATRIX.md` section Production vs Dossier

## Commandes recommandées

```bash
npm run dev:stop
npx prisma generate
npx vitest run tests/remediation-v4-lot-a.test.ts tests/remediation-v4-lot-c.test.ts tests/permissions.test.ts
npm run build
```
