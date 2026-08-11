# 11 — Plan d'action final 10/10

## Score actuel estimé

| Domaine | Score | Cible |
|---|---:|---:|
| Stabilité build/runtime | 9/10 | 10 |
| Architecture | 6/10 | 9 |
| Backoffice | 7/10 | 10 |
| POS/Pricing | 7/10 | 10 |
| Stock/Achats | 8/10 | 10 |
| CRM/Commandes | 7/10 | 9 |
| UX/UI | 7/10 | 9 |
| Tests | 8/10 | 9 |
| Performance | 6/10 | 8 |
| **Global** | **7.2/10** | **10** |

## Vagues d'exécution

### ✅ Vague 1 — Audit + Build (FAIT)

- [x] Dossier `docs/audit-10-10/`
- [x] 11 rapports audit
- [x] Build + typecheck + tests OK
- [x] Fix test publish-bulk

### 🔄 Vague 2 — Architecture + API + Prisma (2 semaines)

| Tâche | P | Effort |
|---|---|---|
| Créer `lib/server/modules/shared/` | P2 | S |
| Consolider `purchases/` + `suppliers/` modules | P1 | M |
| Index Prisma recherche (sku, materialKey) | P1 | S |
| API anomalies matières GET dédiée | P2 | S |
| API audit-log unifiée | P2 | M |

### 🔄 Vague 3 — Backoffice + Pricing + POS (2-3 semaines)

| Tâche | P | Effort |
|---|---|---|
| Regrouper 26 sections → 11 hubs menu | P1 | M |
| Vue globale santé système | P1 | M |
| Migrer grilles SF/PLV → BasePrintingPrice | P1 | L |
| Version + rollback publication | P2 | M |
| POS : version prix dans synthèse | P2 | S |
| Stock check avant panier (tous articles) | P1 | M |

### 🔄 Vague 4 — Stock/Achats/Fournisseurs (1-2 semaines)

| Tâche | P | Effort |
|---|---|---|
| Historique prix achat fournisseur | P1 | M |
| Fournisseur rapide modal stock | P2 | S |
| Maintenance tickets ↔ stock | P2 | M |
| E2E réception achat → matière | P1 | M |

### Vague 5 — CRM/Devis/Commandes/Finance (2 semaines)

| Tâche | P | Effort |
|---|---|---|
| Paiement par commande UX polish | P1 | M |
| Modes paiement Madagascar validation | P1 | S |
| Timeline commande unifiée | P2 | M |
| Snapshot audit visible devis | P2 | S |

### Vague 6 — UI/UX global (1-2 semaines)

| Tâche | P | Effort |
|---|---|---|
| Harmoniser radius/spacing tokens | P2 | M |
| URL persist tabs backoffice | P1 | S |
| Empty/loading/error states manquants | P2 | M |

### Vague 7 — Tests + Perf + Docs (continu)

| Tâche | P | Effort |
|---|---|---|
| Playwright smoke backoffice matières | P1 | S |
| Vitest SKU + conversion + publication | P1 | S |
| Lighthouse perf audit | P2 | S |
| OpenAPI spec routes critiques | P3 | L |

## Definition of Done 10/10

- [ ] Build + 1154+ tests + e2e smoke verts
- [ ] Une source prix active (pas PRIX 2026)
- [ ] Backoffice 11 hubs, tout éditable + publié
- [ ] Stock 4 catégories + SKU + sync matières
- [ ] Chaîne CRM→POS→Devis→Commande→Prod→Stock→Finance E2E
- [ ] Design harmonisé dark/light
- [ ] Audit log modifications prix
- [ ] Documentation utilisateur à jour

## Prochaine action immédiate recommandée

**Vague 2 + 3 en parallèle :** Regrouper menu administration + migrer une famille tariffaire SF vers BasePrintingPrice (pilote Offset 80g).
