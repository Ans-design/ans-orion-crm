# AUDIT 360 — Phase 3 : Backoffice / Data Management

Date : 2026-07-04  
Références : `docs/BACKOFFICE_FLOW.md`, `docs/DATA_MANAGEMENT_AUDIT.md`, `docs/SYNC_MATRIX.md`

---

## État du backoffice

| Section | Route | Source vérité | Statut |
|---------|-------|--------------|--------|
| Vue ensemble | `/administration/vue-ensemble` | DB + health | ✅ |
| Articles / modèles | `/administration/modeles-articles` | Prisma + catalogue | ⚠️ drift code/DB |
| Prix dynamiques | `/administration/prix` + `/admin/pricing` | `ArticlePricingProfile` | ✅ (dual entry P1) |
| Variables globales | `/administration/variables` | `PricingVariable` | ✅ |
| Matières / grammages | `/administration/matieres` | `MaterialCatalog` | ✅ |
| Sync centre | `/administration/synchronisation` | `sync-drift-service` | ✅ |
| Flux / statuts | `/administration/flux-statuts` | `WorkflowTransitionRule` | ✅ |
| Import/export | `/administration/import-export` | APIs admin-config | ⚠️ dispersé |
| Permissions | `/administration/permissions` | `RoleModulePermission` | ✅ |
| Santé système | `/administration/sante` | health APIs | ✅ |

---

## Impact prix / descriptif (lot récent)

- Règles : `variable-price-impact.config.ts` + `price-impact-rules.ts`
- UI : `article-pricing-inline-sections.tsx`, `article-pricing-card.tsx`
- Sync preserve overrides : `sync-dynamic-pricing.ts`
- **Action P1 :** Resync catalogue après modif règles + vérif drift

---

## Anomalies data

| Anomalie | Priorité | Action |
|----------|----------|--------|
| Catalogue code-first (`catalogue.ts`) | P1 | Publication DB progressive |
| Doublon admin pricing | P1 | Rediriger alias, garder `/administration/*` |
| Import anomalies table | P2 | UI centre anomalies |
| Historique prix | P2 | `PriceHistory` — exposer UI |
| Audit log | P1 | Couvrir PATCH pricing |

---

## Objectif cible

Centre d’administration unique :
- Données propres, règles prix visibles
- Badge Descriptif / Impact prix
- Sync POS ↔ devis ↔ commandes monitorée
- Import/export traçable
- Permissions lisibles par rôle

---

## Priorités

**P0 :** Prix publiés = prix POS runtime  
**P1 :** Drift sync, audit log pricing, unification entry admin  
**P2 :** Historique, qualité data trend  
**P3 :** Forest-admin-like views (interne)
