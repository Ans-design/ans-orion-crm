# ANS ORION — Audit approfondi : univers Logistique

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Univers | **Logistique** (sidebar ordre 7) |
| Cible DOM | Bouton « Logistique » (+ badge si livraisons actives) |
| Objectif | Collecte anomalies → roadmap **10/10** |
| Règle | Zéro suppression |
| V4 | B5 Livré→facture + preuve serveur — **partiel UI** |

## Score Logistique : **6,5 / 10**

---

## 0. Badge parent

| Observation | Interprétation |
|-------------|----------------|
| Chiffre éventuel | **`livraisons`** = livraisons actives pipeline — pas le nb de menus |
| Modules | `livraisons` (+ `ws_logistique` → Mon espace) |

---

## 1. Cartographie

| # | Module | Route | Score |
|---|--------|-------|------:|
| 1 | `livraisons` | `/livraisons` | **7,0** |
| 2 | `ws_logistique` | `/workspace/logistique` | **5,0** |

---

## 2. Findings

### P1

| ID | Finding | Evidence | Reco |
|----|---------|----------|------|
| LOG-PROOF-01 | Dispatch / détail « Confirmer Livré » **sans** capture preuve ; erreur `PROOF_REQUIRED` souvent **silencieuse** | `livraisons/page.tsx`, `dispatch-board` | Réutiliser UI livreur (photo+signature) + toast |
| LOG-PERF-01 | `listLivraisons` **unbounded** | repository findMany | Pagination serveur + UI |

### P2

| ID | Finding | Reco |
|----|---------|------|
| LOG-ACCESS-01 | `/livraisons` sans page-access dédié | Aligner `livraisons:read` |
| LOG-FLOW-01 | FlowBanner peu lié au dossier sélectionné | Lier sélection |
| LOG-WS-01 | Workspace shell | Deep-link `?commande=` |

### P3

| ID | Finding | Reco |
|----|---------|------|
| LOG-BADGE | aria « N livraisons actives » | Label |

---

## 3. Modules

### 3.1 Livraisons — 7,0

**Déjà bien :** API gated, deep-link commande, FlowBanner, debounce + virtualisation, empty/error, **vue livreur** preuve photo+signature, CTA facture V4 + `ensureFactureForCommande` après Livré.

**Ouvert :** preuve absente sur dispatch/détail classique ; liste API non bornée ; pas GPS/ETA/POD PDF.

### 3.2 Workspace logistique — 5,0

Cockpit + tournée compacte ; liens `/livraisons` ; placement Mon espace.

---

## 4. Conserver / masquer

| Élément | Action |
|---------|--------|
| Modes liste / dispatch / livreur | Conserver |
| CTA facture post-Livré | Conserver |
| Preuve serveur | Conserver ; compléter UI dispatch |

---

## 5. Besoins modernes

1. Unifier preuve sur **tous** chemins « Livré »  
2. Pagination  
3. POD PDF / SMS client  
4. Optimisation tournée / carte  
5. ETA / tracking  

---

## 6. Roadmap → 10/10

1. LOG-PROOF-01 (bloquant métier)  
2. Pagination + page-access  
3. POD / SMS (P2)  
4. e2e : préparation → preuve → Livré → facture  

---

## 7. Checklist 10/10

- [ ] Impossible de passer Livré sans preuve (UI + API)  
- [ ] Erreur preuve visible  
- [ ] Liste paginée  
- [ ] CTA facture post-Livré (déjà)  
- [ ] Deep-link hub (déjà)  
- [ ] e2e chaîne logistique  
- [ ] Aucune route supprimée  

---

*Téléchargeable.*
