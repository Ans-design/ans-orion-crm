# AUDIT 360 — Phase 1 : Benchmark ERP / CRM / Print MIS

Date : 2026-07-04  
Référence interne : `docs/BENCHMARK_GLOBAL_PRINT_CRM_ERP_BI_REPORT.md`, `docs/BENCHMARK_IDEAS_MATRIX.md`

> Inspiration uniquement — **ne pas migrer** vers SAP, Odoo, Salesforce, etc.

---

## Synthèse par famille

| Famille | Idées à retenir | Ne pas copier | Module ANS | Priorité | Effort | Impact |
|---------|-----------------|---------------|------------|----------|--------|--------|
| **SAP / NetSuite / Dynamics** | Hub commande unique, statuts workflow, audit trail | UI lourde, implémentation longue | `/commandes/[id]` | P1 | M | Élevé |
| **Odoo / Zoho** | CRM→devis→facture chaîne, relances | Double saisie modules | Devis, CRM, Finance | P1 | M | Élevé |
| **EFI Pace / Tharstern / PrintVis** | Devis imprimerie, surfaces m², laizes, gâche | Pricing US/EU | POS, pricing dynamique | P0 | L | Critique |
| **Cadratin / MultiPress / Hiflex** | Variables tarifaires vs descriptives, familles produits | Modèle France-only | Backoffice prix, POS | P1 | M | Élevé |
| **Salesforce** | Timeline client, relances, scoring | Coût licence | CRM clients | P2 | M | Moyen |
| **Monday / Asana / Jira** | Kanban tâches, SLA, assignation | PM générique hors métier | `/equipe/taches`, GPAO | P2 | S | Moyen |
| **HP PrintOS** | Suivi machine, files d’impression | Cloud fermé | `/machines`, production | P3 | L | Futur |

---

## Adaptations ANS ORION recommandées

### Devis imprimerie (P1)
- Conserver moteur dynamique Prisma + règles `price-impact-rules.ts`
- Ajouter comparatif devis brouillon vs publié (inspiré Print MIS)

### Workflow devis → commande (P1 — déjà partiel)
- Snapshot acceptation (`order-snapshot.ts`) ✅
- Renforcer prochaine action (`lib/flow/next-action.ts`) sur chaque écran

### BAT (P1)
- Lien obligatoire commande ↔ proof ↔ studio brief
- Portail client `/bat/valider/[token]` ✅ — améliorer notifications

### Planification GPAO (P2)
- `/planning` + dossiers production — ajouter charge machine réelle

### Coûts de revient (P2)
- `/finance/couts-revient` — connecter consommation stock réelle post-production

### Dashboard direction (P1)
- KPI depuis DB uniquement (`dashboard/summary`) — éviter mocks résiduels

---

## Priorisation benchmark

| P0 | Pricing POS exact, hub commande fiable |
| P1 | Sync backoffice, BAT workflow, relances CRM |
| P2 | Planning machine, coût revient, exports BI |
| P3 | PrintOS-like telemetry, IA devis |

---

*Voir matrice détaillée : `docs/BENCHMARK_TO_ACTION_PLAN.md`*
