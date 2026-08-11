# AUDIT 360 — Plan maître final ANS ORION

Date : 2026-07-04  
Statut : **Audit terminé — corrections majeures en attente de validation utilisateur**

---

## 1. Résumé exécutif

ANS ORION est un ERP/CRM/POS/GPAO **mature et étendu** (85 pages, 224 APIs, 99 modèles Prisma, ~991 tests). Le projet est **buildable et type-safe** au 2026-07-04. Les forces majeures sont le hub commande 360°, le moteur pricing dynamique, le backoffice administration, et la couverture métier imprimerie. Les faiblesses principales sont la **dualité code/DB catalogue**, la **fragmentation services API**, la **validation manuelle incomplète** des lots récents (paiement commande, impact prix POS), et les modules RH/fiscalité **à valider par experts locaux**.

**Priorité absolue :** fiabilité données (prix, paiements, sync), hub commande, puis UX/UI.

---

## 2. Diagnostic global

| Dimension | Score /5 | Commentaire |
|-----------|----------|-------------|
| Architecture | 4 | Next.js solide, dual layer services |
| Métier imprimerie | 4 | POS, laizes, finitions, GPAO |
| Sync modules | 3 | Drift possible, centre sync existe |
| UX | 3.5 | Hub bon, POS dense |
| UI / Design | 3.5 | Tokens Orion, incohérences mineures |
| Sécurité | 3.5 | RBAC pages OK, API inégale |
| Tests | 4 | Vitest large, E2E partiel |
| RH / Legal Mada | 2.5 | À valider expert |
| Finance Mada | 3 | Paiement récent, export comptable P1 |

---

## 3. Forces du projet

- Hub commande `/commandes/[id]` intégré (finance, BAT, prod, talk)
- Moteur pricing dynamique Prisma + règles impact prix descriptif/tarifaire
- Backoffice administration structuré (`/administration/:section`)
- 12 profils rôles, 11 univers sidebar
- Chaîne devis → commande → facture → paiement
- ANS Talk lié aux commandes
- Documentation riche (89+ docs), roadmap 40 étapes
- Zéro suppression modules — aliases legacy préservés

---

## 4. Faiblesses critiques

1. Catalogue partiellement code-first vs DB
2. ~90 routes API Prisma direct sans façade
3. Dual entry admin (`/admin/pricing`, `/admin-control`)
4. Validation manuelle lots récents non signée
5. RH paie / fiscalité non certifiées localement
6. Polling ANS Talk — perf et auth

---

## 5. Risques P0

| Risque | Mitigation |
|--------|------------|
| Prix POS incorrect | Règles impact prix + sync backoffice |
| Paiement/facture désalignés | `syncCommandeLinkedFacturesFromPayments` — valider |
| Perte session auth | Middleware + NextAuth — monitorer |
| Build cassé | CI typecheck + test + build |

*Aucun P0 actif au build 2026-07-04.*

---

## 6. Risques P1

- Drift sync backoffice → POS
- KPI dashboard mocks résiduels
- API validation inégale
- GPAO auto-création incomplète
- Export comptable manquant
- Gate RH retard fail-open serveur

---

## 7. Améliorations P2

- Design system unifié, Storybook
- Planning machine
- Relances CRM auto
- Contraste/accessibilité AA
- E2E RH/finance/GPAO
- Transporteurs Mada

---

## 8. Idées futures P3

- WebSocket ANS Talk
- BI forecasting
- Portail client
- e-Déclaration DGI
- n8n automations
- Upgrade Next.js 15+

---

## 9–20. Synthèse phases audit

| Phase | Document | Synthèse |
|-------|----------|----------|
| 0 Baseline | `AUDIT_360_PHASE_0_BASELINE.md` | Stack, routes, Prisma, validation |
| 1 Benchmark | `AUDIT_360_BENCHMARK_ERP_PRINT_CRM.md` | Print MIS, ERP, CRM inspiration |
| 2 Code/Sec | `AUDIT_360_CODE_SECURITY_PERFORMANCE.md` | API, dette, perf |
| 3 Backoffice | `AUDIT_360_BACKOFFICE_DATA_MANAGEMENT.md` | Prix, sync, data |
| 4 UI | `AUDIT_360_UI_DESIGN_SYSTEM.md` | Tokens, composants |
| 5 UX | `AUDIT_360_UX_WORKFLOWS.md` | Flux, heuristiques |
| 6 Contenu | `AUDIT_360_CONTENT_SEO_PRINTING.md` | Microcopy, SEO |
| 7 Features | `AUDIT_360_FEATURES_GAP_ANALYSIS.md` | Gaps, roadmap |
| 8 Chat | `AUDIT_360_CHAT_ANS_TALK.md` | Messaging, polling |
| 9 Couleurs | `AUDIT_360_COLOR_ACCESSIBILITY.md` | Contraste, palette |
| 10 Process | `AUDIT_360_PROCESS_TASKS_SYNC.md` | Workflows |
| 11 RH | `AUDIT_360_RH_LEGAL_MADAGASCAR.md` | Conformité à valider |
| 12 Logistique | `AUDIT_360_LOGISTICS_COOPERATIVES_MADAGASCAR.md` | Livraison Mada |
| 13 Admin | `AUDIT_360_ADMINISTRATION_COMPLETE.md` | Admin complet |
| 14 Typo | `AUDIT_360_TYPOGRAPHY_ICONS.md` | Polices, icônes |
| 15 Finance | `AUDIT_360_FINANCE_TAX_MADAGASCAR.md` | Fiscalité à valider |
| 16 Sync | `AUDIT_360_SYNC_MATRIX.md` | Matrice flux |

---

## 21. Roadmap 10 vagues (exécution Cursor)

| Vague | Focus | Durée estimée |
|-------|-------|---------------|
| **1** | Valider lot paiement + impact prix (manuel + tests) | 1 sem |
| **2** | Sync backoffice drift, centre sync, audit API paiement/pricing | 1–2 sem |
| **3** | Hub commande : facture auto, next-action, flow banner | 2 sem |
| **4** | Façade services API, validation Zod routes P1 | 2–3 sem |
| **5** | UX POS + commande 360 polish | 2 sem |
| **6** | Dashboard KPI 100% DB | 1 sem |
| **7** | RH gate + paie (expert local) | 3 sem |
| **8** | Export comptable + finance Mada | 2 sem |
| **9** | ANS Talk perf + auth fix | 1–2 sem |
| **10** | BI, logistique transporteurs, P3 | ongoing |

---

## 22. Prompts Cursor de correction recommandés

```
1. "Valider et compléter tests paiement commande + resync factures"
2. "Audit requirePermission sur routes /api/messaging et /api/paiements"
3. "Unifier entry admin pricing vers /administration/prix avec redirects"
4. "Généraliser flow-context-banner sur devis, commande, production"
5. "Drift sync : script vérification post-publication prix"
6. "Export comptable CSV factures/paiements période"
7. "RH late-arrival fail-closed serveur"
8. "Lazy-load POS configurateur + split config-types par famille"
```

---

## 23. Commandes tests

```bash
npm run typecheck
npx prisma validate
npx prisma generate
npm run test
npm run test:e2e:smoke
npm run build
npm run dev:local
npm run audit:vercel
```

---

## 24. Critères de validation

- [ ] 0 erreur `typecheck` + `build`
- [ ] 100% tests Vitest passent
- [ ] Smoke E2E passent
- [ ] POS : variables descriptives n’impactent pas le prix (échantillon 10 articles)
- [ ] Paiement commande met à jour commande + factures liées
- [ ] Centre sync sans drift critique post-publication
- [ ] Hub commande répond aux 4 questions métier
- [ ] RBAC paie/RH restrictif
- [ ] Checklists rapports POS/paiement signées

---

## Livrables audit

Tous les fichiers `docs/AUDIT_360_*.md` (18 documents).

---

```
AUDIT 360 ANS ORION TERMINÉ
Rapport principal : docs/AUDIT_360_FINAL_MASTER_PLAN.md
```

*Aucune grosse correction métier appliquée dans ce lot audit — 1 test Vitest aligné sur règle coins descriptifs.*
