# Rapport — Gestion de données 10 étapes

> **Date :** juillet 2026  
> **Mission :** Transformer ANS ORION en ERP/CRM/GPAO plus fiable et administrable.

---

## Résumé

| Étape | Statut | Livrable |
|-------|--------|----------|
| 1. Audit données | ✅ | `docs/DATA_MANAGEMENT_AUDIT.md` |
| 2. Dictionnaire | ✅ | `docs/DATA_DICTIONARY.md` |
| 3. Modélisation Prisma | ✅ Doc | `docs/DATABASE_MODELING_RECOMMENDATIONS.md` |
| 4. Backoffice data admin | 🟡 Partiel | `pricing-v4` + sections admin existantes |
| 5. CRUD standardisé | 🟡 En cours | 6 modules + `lib/server/crud/` |
| 6. Vues données avancées | 🟡 Partiel | CRM fiche, commande 360, kanban, dispatch |
| 7. Data quality | 🟡 Amorcé | `lib/server/modules/data-quality/` + API |
| 8. Audit log / versioning | 🟡 Partiel | `AuditLog` + `logAuditChange` |
| 9. Import / export | 🟡 Partiel | `docs/DATA_IMPORT_EXPORT_PLAN.md` + routes existantes |
| 10. Dashboard data mgmt | ⏳ | Section admin à enrichir |

---

## Étape 1 — Audit ✅

- 14 domaines audités (CRM → Dashboard)
- **47 problèmes** classés P0–P3
- Matrice propriétaire des données
- Vagues 2–7 planifiées

## Étape 2 — Dictionnaire ✅

- 25+ entités documentées (champs, validation, relations, permissions)
- Règle : chaque donnée a un module propriétaire

## Étape 3 — Modélisation ✅ (documentation)

- Indexes recommandés (Client partiellement appliqué)
- Enums proposés
- Snapshots `paymentSnapshot`, `logisticsSnapshot`
- Pas de migration destructive dans cette phase

## Étape 4 — Backoffice 🟡

**Existant :**
- `/administration/:section` — 20 sections
- CRUD articles, prix, variables, matières, import-export config
- Onglet anomalies (UI)

**À faire :**
- Fiches relationnelles unifiées (client → commandes)
- Colonnes configurables, export inline
- Page `/administration/data-management`

## Étape 5 — CRUD 🟡

**Migré vers `lib/server/modules/` :**
- clients (complet)
- commandes, devis, paiements, factures, livraisons (routes principales)

**Ajouté :**
- `lib/server/crud/` — helpers list/get pagination

**Reste :** stock, production, RH, messaging, admin-config (~180 routes)

## Étape 6 — Vues avancées 🟡

| Module | Vues existantes |
|--------|-----------------|
| Clients | liste, fiche, historique, drawer |
| Commandes | liste, kanban, 360, timeline partielle |
| Livraisons | dispatch board, livreur mobile |
| Production | planning, kanban GPAO |
| Backoffice | tableaux admin pricing-v4 |

## Étape 7 — Data quality 🟡

- Service `data-quality` avec règles déclaratives
- `GET /api/admin/data-quality` — anomalies agrégées (lecture)
- Brancher panneau `/administration/anomalies`

## Étape 8 — Historique 🟡

- `AuditLog` en production
- `logAudit` / `logAuditChange` sur modules commerciaux migrés
- **Manque :** `before`/`after` JSON systématique, UI historique par fiche

## Étape 9 — Import / export 🟡

- Plan documenté
- Import clients/tarifs fonctionnel
- Preview import + CSV étendu = vague 6

## Étape 10 — Dashboard ⏳

Intégrer dans `vue-ensemble` ou nouvelle section :
- santé données, volumes, sync, anomalies, logs récents

---

## Inspirations appliquées

| Source | Pratique retenue |
|--------|------------------|
| ERPNext / Odoo | DocType mental, workflows statut, propriétaire module |
| Refine | Pattern resource repository/service |
| Forest / Retool | Panneau anomalies, actions admin |
| Strapi / Directus | Dictionnaire, validation avant publish |
| Supabase Studio | Clarté relations, health checks |

---

## Tests & validation

```bash
npx prisma validate    # ✅
npm run typecheck      # ✅
npm run test           # ✅ (+ data-quality)
npm run dev:local      # http://127.0.0.1:3020
```

**Flux à tester manuellement :** client → devis → commande → facture → paiement → livraison

---

## Prochaines priorités (local, sans deploy)

1. Brancher UI anomalies sur `GET /api/admin/data-quality`
2. Migrer stock + production vers `lib/server/modules/`
3. Preview import `POST /api/import/preview`
4. Enrichir `AuditLog` (before/after)
5. Dashboard data dans administration

---

## Critères ULTRAPROMPT

| Critère | État |
|---------|------|
| Audit gestion données | ✅ |
| Dictionnaire | ✅ |
| Routes data critiques | 🟡 modules commerciaux OK |
| Backoffice admin | 🟡 riche, à unifier |
| CRUD standardisés | 🟡 6/63 modules API |
| Validations backend | 🟡 Zod modules migrés |
| Anomalies détectées | 🟡 service amorcé |
| Historique | 🟡 partiel |
| Import/export structuré | 🟡 plan + existant |
| Prisma validé | ✅ |
| Build OK | À vérifier après merge |

**Mission étapes 1–3 + fondations 5–7–9 : documentées et amorcées.** Implémentation complète = vagues 2–7 progressives.
