# Phase 7 — Data management

**Date :** 2026-06-24  
**Statut :** Intégré  
**Périmètre :** Qualité des données, gouvernance snapshots, API stock standardisée.

---

## Objectif

Renforcer la **gouvernance des données** ERP : détection d’anomalies fiable, backfill snapshots depuis l’UI, et réponses API cohérentes.

---

## Qualité des données

### Règles enrichies (`data-quality.rules.ts`)

| Règle | Sévérité |
|-------|----------|
| `commande-no-payment-snapshot` | medium |
| `devis-no-logistics-snapshot` | medium |
| `devis-expired-pending` | high |

**12 règles** au total (CRM, Commandes, Devis, Finance, Logistique, Stock, ANS Talk).

### Service (`data-quality.service.ts`)

- Comptages **exacts** via `prisma.count` (plus de limite échantillon sur le total)
- Échantillons limités à 5 IDs pour les liens UI
- Persistance scan dans `AuditLog` (inchangé)

### UI

- `DataQualityPanel` — `readApiJson`, liens multiples vers fiches
- Onglet **Anomalies** backoffice + section `/administration/data-management`

---

## Backfill snapshots

| Fichier | Rôle |
|---------|------|
| `lib/server/modules/snapshots/snapshot.service.ts` | `backfillEntitySnapshots()` extrait du script |
| `POST /api/admin/data-management/backfill-snapshots` | Backfill admin (dry-run via `?dryRun=1`) |
| `scripts/backfill-entity-snapshots.ts` | CLI → délègue au service |
| `DataManagementPanel` | Boutons **Backfill** et **Simuler** |

---

## API stock standardisée

Routes `/api/stock` et `/api/stock/[id]` renvoient `{ ok: true, data }`.

Page **Stock** mise à jour avec `unwrapApiData`.

---

## Centre de gouvernance

`/administration/data-management` affiche :

- KPI anomalies / volumes / audit 24h
- Tendance qualité (graphique + export CSV)
- Backfill snapshots
- Panneau qualité ERP
- Logs audit récents

---

## Tests

- `tests/data-quality.test.ts` — règles + export backfill
- Suite complète : **965 tests**

---

## Vérifications

```bash
npm run typecheck
npm run test
```

**Manuel :** `/administration/data-management` → rescanner → backfill si snapshots manquants.

---

## Prochaine étape — Phase 8

Monitoring / QA / Sentry / tests E2E étendus.
