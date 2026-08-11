# ANS ORION — Audit approfondi : univers Finance

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Univers | **Finance** (sidebar ordre 8) |
| Cible DOM | Bouton « Finance » (**souvent sans badge**) |
| Objectif | Collecte anomalies → roadmap **10/10** |
| Règle | Zéro suppression ; marges / coûts protégés |

## Score Finance : **6,1 / 10**

---

## 0. Badge parent

| Observation | Interprétation |
|-------------|----------------|
| Pas de `MODULE_BADGE_KEYS` finance | Aucun badge live parent |
| Opportunité | Impayés / factures échues |

`ws_finance` → Mon espace.

---

## 1. Cartographie & scores

| # | Module | Route | Score |
|---|--------|-------|------:|
| 1 | `ws_finance` | `/workspace/finance` | **5,5** |
| 2 | `factures` | `/factures` | **7,5** |
| 3 | `paiements` | `/paiements` | **7,5** |
| 4 | `finance_charges` | `/finance/charges` | **5,5** |
| 5 | `finance_couts` | `/finance/couts-revient` | **4,0** |
| 6 | `finance_fiscalite` | `/finance/fiscalite` | **5,0** |
| 7 | `finance_ventes_directes` | `/finance/ventes-directes` | **5,0** |
| 8 | `caisse` | `/caisse` | **6,5** |

---

## 2. Findings

### P0

| ID | Finding | Evidence | Reco |
|----|---------|----------|------|
| FIN-MARGIN-01 | Commentaire « finance voit coûts » mais `canViewMargin` = **`pos:view_margin` seulement** — rôle `finance` **n’a pas** cette perm → API strip marges alors que page-access autorise `/finance/couts-revient` | `margin-access.ts`, `permissions.ts`, `couts-revient/route.ts` | Accorder marge via `finance:read` **ou** `pos:view_margin` ; UI empty si strip |

### P1

| ID | Finding | Reco |
|----|---------|------|
| FIN-FISCAL-01 | UI fiscalité ouverte à finance ; POST exige **`settings:write`** (admin) | Mutations en `finance:write` |
| FIN-ACCESS-01 | `FINANCE_PAGE_ROLES` trop large (commercial, cm, livraison, demo sur factures/paiements) | Restreindre write UI |
| FIN-UX-01 | Charges / coûts / ventes : peu de FlowBanner / deep-link ; coûts sans empty | Alignement hub |

### P2

| ID | Finding | Reco |
|----|---------|------|
| FIN-DEMO-01 | Démo : caisse + écritures factures/paiements bloquées — **OK** | Banner lecture seule |
| FIN-PERF-01 | Charges/couts/ventes take sans pagination UI | Contrôles |
| FIN-COUTS | Heuristique matière « 62% » non Backoffice | Coût réel GPAO/stock |

### P3

| ID | Finding | Reco |
|----|---------|------|
| FIN-BADGE | Badge impayés sur univers | Clé nav-badges |
| FIN-WS | order-list vs Mon espace | Doc |

---

## 3. Modules — synthèse

| Module | Déjà bien | Ouvert |
|--------|-----------|--------|
| Factures | Auth, deep-link, Flow, pagination, empty, démo block write | e-invoicing, avoirs riches |
| Paiements | Idem + batch | Échéancier, prélèvement |
| Charges | API finance:* | Budgets, PJ, flow |
| Coûts revient | Strip marge | **P0** rôle finance ; take 30 ; empty |
| Fiscalité | Lecture | Write settings:write mismatch |
| Ventes directes | Décrément stock | Sync POS / marge |
| Caisse | close_register ; démo bloqué | Multi-caisses, Z-report |
| ws_finance | KPI cockpit | Deep-link faible |

---

## 4. page-access vs API

| Route | page-access | API | Risque |
|-------|-------------|-----|--------|
| `/finance/couts-revient` | + finance | strip si !margin | **P0** |
| `/finance/fiscalite` | + finance | POST `settings:write` | **P1** |
| `/factures` `/paiements` | rôles larges | factures/paiements:* | **P1** write UI |
| `/caisse` | caisse/finance/admin | démo bloqué | OK |

---

## 5. Orphelins / conserver

| Élément | Action |
|---------|--------|
| Alias `/finance/factures` | Conserver |
| Démo blocks | Conserver |
| Coûts même strip | Ne pas supprimer ; aligner droits |

---

## 6. Besoins modernes

1. Aligner marge rôle finance  
2. Fiscalité opérable par finance  
3. Coût revient = consommation stock + GPAO (Backoffice)  
4. Badge impayés  
5. Relance auto / e-facture  
6. Z-report caisse PDF  

---

## 7. Roadmap → 10/10

1. **FIN-MARGIN-01**  
2. **FIN-FISCAL-01** + restreindre FINANCE_PAGE_ROLES  
3. Empty/pagination/flow modules secondaires  
4. Coûts liés production réelle + e2e encaissement  

---

## 8. Checklist 10/10

- [ ] Rôle finance voit coûts **ou** message explicite (pas NaN)  
- [ ] Aucune fuite marge sans permission  
- [ ] Fiscalité write cohérente  
- [ ] Factures/paiements write restreints  
- [ ] Démo lecture seule (déjà partiel)  
- [ ] Deep-link hub finance  
- [ ] e2e : Livré → facture → paiement → caisse  
- [ ] Aucune suppression métier  

---

*Téléchargeable.*
