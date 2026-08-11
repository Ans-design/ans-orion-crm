# ANS ORION — Audit approfondi : univers Stock & Achats

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Univers | **Stock & Achats** (sidebar ordre 3) |
| Cible DOM | `SidebarUniverseNav` → bouton « Stock & Achats 6 » (`aria-expanded=false`) |
| Objectif | Collecte anomalies → roadmap **10/10** imprimerie moderne |
| Règle | **Zéro suppression** — masquer / rediriger / fusionner / documenter |
| Remédiation V4 | Pagination serveur stock + suggest achats + picker BaseMaterial + drift — **partiels** |

## Score Stock & Achats : **6,2 / 10**

---

## 0. Lecture DOM « Stock & Achats 6 »

| Observation | Interprétation |
|-------------|----------------|
| Univers replié | `aria-expanded="false"` |
| Groupe `[2]` | 3ᵉ univers (après Pilotage, Commercial) |
| Chiffre **6** | **Badge live `stockAlerts`** = nombre d’articles sous seuil (`(qty − reserved) ≤ minQty`) — **pas** le nombre de menus |

Canal unique mappé : `MODULE_BADGE_KEYS.stock = 'stockAlerts'` → `getStockAlerts().length`.

**Items réellement visibles sous Stock (admin)** ≈ 7 (pas 6) :

`stock` · `achats` · `fournisseurs` · `materiels` · `machines` · `maintenance_tickets` · `rh_equipements`

`ws_magasin` / `ws_maintenance` sont dans l’ordre-list mais **overridés → Mon espace**.

---

## 1. Périmètre & cartographie

| # | Module | Route | Placement réel | Score |
|---|--------|-------|----------------|------:|
| 1 | `stock` | `/stock` | Stock | **7,0** |
| 2 | `ws_magasin` | `/workspace/magasin` | Mon espace | **4,0** |
| 3 | `achats` | `/achats` | Stock | **6,5** |
| 4 | `fournisseurs` | `/fournisseurs` | Stock | **7,0** |
| 5 | `materiels` | `/materiels` | Stock | **4,5** |
| 6 | `machines` | `/machines` | Stock | **5,5** |
| 7 | `maintenance_tickets` | `/maintenance/tickets` | Stock | **5,0** |
| 8 | `rh_equipements` | `/rh/equipements` | Stock (à masquer) | **3,0** |
| 9 | `ws_maintenance` | `/workspace/maintenance` | Mon espace | **5,0** |

### page-access vs API (écarts)

| Route | page-access | API typique | Risque |
|-------|-------------|-------------|--------|
| `/stock` | + caisse, livraison | souvent `production:read` / `stock:*` | Page OK / API 403 |
| `/achats` | + production | `achats:read` — **production n’a pas** | **P1** |
| `/fournisseurs` | + production | `fournisseurs:read` — production n’a pas | **P1** |
| `/materiels`, `/maintenance/tickets` | **aucune règle** | `production:*` | Trop ouvert **P2** |

---

## 2. Findings par sévérité

### P0

| ID | Finding | Evidence | Reco |
|----|---------|----------|------|
| STK-SEC-01 | Liste `/api/purchase-orders` **fuite `unitCost` / `totalHT`** sans `stripPurchaseOrder` | `purchase-orders/route.ts` calcule unitCost ; strip seulement sur `[id]` | Appliquer `stripPurchaseOrder` sur chaque ligne liste |

### P1

| ID | Finding | Reco |
|----|---------|------|
| STK-PERF-01 | UI `/stock` n’envoie pas `page`/`pageSize` → truncation silencieuse (>50) | Contrôles pagination + query |
| STK-PERF-02 | Anomalies / materiels / machines / tickets / `listBaseMaterials` **non bornés** | `take` + pagination |
| STK-ACCESS-01 | page-access ≠ permissions (caisse/livraison/production) | Aligner règles |
| STK-SEC-02 | Onglet finance machines (coûts) non gated | Exiger `pos:view_margin` ou `finance:read` |
| STK-FEAT-01 | Pas d’écran **inventaire physique** / cycle count | Module `/inventaire` ou onglet stock |
| STK-UX-01 | `rh_equipements` = filtre heuristique machines, pas inventaire personnel | Masquer du Stock → Mon espace ; vraie assignation |
| STK-HUB-01 | Achats sans `?commande=` / lien hub | Deep-link + filtre |

### P2

| ID | Finding | Reco |
|----|---------|------|
| STK-NAV-01 | order-list contient `ws_*` absents du parent Stock | Doc / nettoyer order-list |
| STK-EMPTY-01 | `/materiels` sans empty state | `AppEmptyState` |
| STK-NAMING | « Matériels » ≠ matières stock imprimerie | Renommer label |
| STK-MACH | Machines en Stock vs usage Planning Production | Documenter double foyer ; ne pas supprimer |
| STK-MULTI | Multi-entrepôt / laizes / consommation GPAO UI faible | Roadmap métier |

### P3

| ID | Finding | Reco |
|----|---------|------|
| STK-BADGE | Confusion badge « 6 » vs menus | `aria-label` « N alertes stock » |
| STK-CPS | Double vue Admin catalogue-prix-stock | Banner « inventaire ops = `/stock` » |
| STK-ALIAS | `/api/stock/items` aliases | Conserver |

---

## 3. Détail modules

### 3.1 Gestion stocks `/stock` — 7,0

**Déjà bien :** deep-link commande, FlowBanner, strip `unitCost`, picker BaseMaterial, sync réception BC, drift Stock↔BaseMaterial, skeleton/empty.

**Ouvert :** pagination UI, anomalies unbounded, API permission inconsistante (`production:read` vs `stock:read`).

### 3.2 Mon magasin — 4,0

Shell KPI ~51 LOC ; copy « inventaire/réservations » sans UI dédiée ; placement Mon espace.

### 3.3 Achats — 6,5

**Déjà bien :** `suggest=1`, réception atomique → stock, pagination take≤100.

**Ouvert :** P0 fuite coûts liste ; pas de deep-link commande ; éditeur BC limité.

### 3.4 Fournisseurs — 7,0

CRUD OK, debounce, empty state. Manque : lead time, MOQ, scoring.

### 3.5 Matériels & équipements — 4,5

Parc RH/IT (pas matières print) ; findMany unbounded ; bouton + peu branché ; empty manquant.

### 3.6 Machines — 5,5

UI riche ~381 L ; list unbounded ; coûts finance ungated ; lien pièces détachées faible.

### 3.7 Tickets maintenance — 5,0

Création peut passer machine `down` ; unbounded ; pas SLA / photos / impact commande.

### 3.8 Mes équipements — 3,0

**Candidat masquer** hors Stock ; implémentation trompeuse.

### 3.9 Workspace maintenance — 5,0

Checklist localStorage ; liens tickets/machines ; `tech_ws` déjà `hidden` (garder).

---

## 4. Orphelins / masquer / ne pas supprimer

| Élément | Action |
|---------|--------|
| `rh_equipements` dans Stock | **Masquer** / `MODULE_TO_UNIVERSE → mon_espace` |
| `ws_magasin`, `ws_maintenance` | Rester Mon espace ; retirer de la doc « items Stock » |
| `tech_ws` hidden | Conserver |
| Aliases `/api/stock/items/*` | Conserver |
| CPS admin stock views | Conserver + clarifier labels |
| Machines + tickets | Ne pas supprimer ; éventuel regroupement soft Production plus tard |

---

## 5. Besoins d’ajout (imprimerie moderne)

1. Inventaire physique / écarts / verrouillage période  
2. Strip coûts achats sur **toute** surface API  
3. Deep-link Achats ↔ commande / GPAO  
4. Consommation matière visible depuis dossier commande  
5. Lien pièces détachées machines ↔ stock  
6. Multi-emplacement / rouleaux grand format (laizes cm)  
7. Alertes stock actionnables (créer BC en 1 clic depuis alerte)

---

## 6. Remédiation V4 — état réel

| Item | État |
|------|------|
| Pagination serveur stock | **PARTIAL** (serveur OK, UI non) |
| take matières 5000→1000 | **PARTIAL** (`listBaseMaterials` encore unbounded) |
| Achats suggest | **FIXED** |
| Picker BaseMaterial | **FIXED** |
| Drift stock/matériau | **FIXED** |

---

## 7. Roadmap → 10/10

### Lot S-A — P0 sécurité (0,5 j)

- Strip liste purchase-orders + gate finance machines

### Lot S-B — P1 perf & accès (1–2 j)

- Pagination UI stock ; bornes anomalies/machines/matériels/tickets/base-materials
- Aligner page-access ↔ permissions

### Lot S-C — P1 métier (1–2 j)

- Inventaire physique minimal
- Deep-link achats ↔ commande
- Reclasser `rh_equipements`

### Lot S-D — polish

- Empty states, aria-label badge, labels matières vs matériels, e2e réception BC

---

## 8. Checklist 10/10 Stock & Achats

- [ ] Aucune fuite prix d’achat / unitCost sans `pos:view_margin`
- [ ] Listes > 50 avec pagination UI + serveur
- [ ] page-access = permissions API
- [ ] Inventaire physique opérationnel
- [ ] Achats ↔ hub commande
- [ ] Alertes stock → action BC
- [ ] Maintenance hors confusion « matières print »
- [ ] Badge parent libellé « alertes »
- [ ] e2e : alerte → BC → réception → mouvement stock
- [ ] Aucune route métier supprimée

---

*Document téléchargeable — suite audit : Studio & BAT (`AUDIT_STUDIO_BAT_2026-07-31.md`).*
