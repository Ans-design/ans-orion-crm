# ANS ORION — Audit approfondi : univers Commercial

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Univers | **Commercial** (sidebar ordre 2) |
| Cible DOM | `SidebarUniverseNav` → `button.orion-sb-universe-btn` « Commercial 6 » |
| Sous-modules | Clients · POS · Panier · Devis · Commandes · Réclamations |
| Objectif | Collecte anomalies → roadmap **10/10** |
| Règle | Zéro suppression — masquer / rediriger / fusionner |
| Prérequis | Post-remédiation Pilotage V5 · V4 lots A–F partiels |
| Docs liées | `AUDIT_MODULES_COMPLET_2026-07-30.md` §2 · `AUDIT_SIDEBAR_ADMIN_COMMERCIAL_2026-07-30.md` |

## Score Commercial : 6,6 / 10

---

## 0. Lecture du DOM « Commercial 6 »

| Observation | Interprétation |
|-------------|----------------|
| `aria-expanded="false"` | Univers **replié** |
| Groupe `[1]` | 2ᵉ univers (après Pilotage) |
| Chiffre **6** sur le bouton parent | **`SidebarBadge`** = somme live `/api/nav/badges` (devis + commandes + réclamations) |

Deux canaux distincts dans `sidebar-universe-nav.tsx` :

1. **Badge parent (visible replié)** — `sumUniverseBadge` via `MODULE_BADGE_KEYS` (`commandes`, `devis`, `reclamations`). Si la somme vaut 6, l’UI affiche « Commercial **6** ».
2. **Flow steps (visibles déployés)** — pastilles **1→6** sur les sous-liens (`COMMERCIAL_FLOW_STEPS`) ; Réclamations = étape structurelle 6.

→ Ne pas confondre **badge opérationnel** (compteur) et **étape de parcours** (structure). L’univers contient exactement **6 modules**.

Ordre canonique (`UNIVERSE_MODULE_ORDER.commercial` = `COMMERCIAL_FLOW_ORDER`) :

1. Clients → 2. POS → 3. Panier → 4. Devis → 5. Commandes → 6. Réclamations

`flowLabel` : *Client → POS → Panier → Devis → Commande → Réclamations*

---

## 1. Périmètre & cartographie

| # | Module | Route | Group registry | Univers |
|---|--------|-------|----------------|---------|
| 1 | `clients` | `/clients` | `crm_clients` | Commercial |
| 2 | `pos` | `/pos`, `/pos/[id]` | `ventes_pos` | Commercial |
| 3 | `panier` | `/panier` | `ventes_pos` | Commercial |
| 4 | `devis` | `/devis` (+ redirect `[id]`) | `devis_facturation` | Commercial |
| 5 | `commandes` | `/commandes`, `/commandes/[id]` | `gpao_production` ⚠️ override | Commercial |
| 6 | `reclamations` | `/reclamations` | `crm_clients` | Commercial |

### APIs clés

| API | Permission |
|-----|------------|
| `/api/clients*` | `clients:read` / `write` |
| `/api/pos/*`, `/api/pricing/simulate` | `pos:use` (+ sanitize marge) |
| `/api/cart*` | `pos:use` |
| `/api/devis*` | `devis:read` / `write` / `accept` |
| `/api/commandes*` | `commandes:read` / `write` |
| `/api/reclamations*` | `clients:read` / `write` |

`page-access` : seule `/pos` a une règle dédiée (`POS_PAGE_ROLES`). Les autres routes Commercial = connecté + API.

---

## 2. Scores par sous-module

| Sous-module | Score | Verdict |
|-------------|------:|---------|
| Clients `/clients` | **6,5** | Auth OK ; monolithe ~1794 L ; pagination silencieuse |
| POS `/pos` + `[id]` | **5,5** | Auth OK ; **P0** monolithe ~2600 L + `calculate.ts` ~921 L |
| Panier `/panier` | **7,0** | UX OK ; hybrid localStorage + API |
| Devis `/devis` | **7,5** | Flow + pagination ; page encore large |
| Commandes hub | **8,0** | Meilleur du commercial |
| Réclamations | **5,5** | Schéma `commandeId` **FIXED** ; UI SAV incomplète |

---

## 3. Findings détaillés

### 3.1 Clients — 6,5/10

| ID | Sev | Finding | Reco |
|----|-----|---------|------|
| CRM-01 | P1 | Monolithe `clients-page.tsx` ~1794 L | Découper list / detail / form / SAV |
| CRM-02 | P1 | API paginée (25) sans contrôles UI → truncation silencieuse | `page`/`pageSize` + `AppListPagination` |
| CRM-03 | P2 | Création réclamation sans `commandeId` | Select commandes du client |
| CRM-04 | P2 | Solde / CA visibles à tout `clients:read` | Gate finance si besoin |

### 3.2 POS — 5,5/10

| ID | Sev | Finding | Reco |
|----|-----|---------|------|
| POS-01 | **P0** | Configurateur `pos/[id]` monolithe (~2600 L) | Extraire pricing / GF / cart / gates |
| POS-02 | **P0** | `lib/pricing/calculate.ts` ~921 L | Router par famille ; ne plus grossir |
| POS-03 | P2 | `/api/pos/price-preview` non sanitizé marge | Réutiliser `sanitizePricingPayloadForRole` |
| POS-04 | P2 | Catalogue chargé en full | Pagination / count-first |

**Déjà bien :** simulate strip marge ; debounce prix ; `CommandeDeepLinkBanner`.

### 3.3 Panier — 7/10

| ID | Sev | Finding | Reco |
|----|-----|---------|------|
| PAN-01 | P1 | Dual `cart-store` (localStorage) + `/api/cart` | Server-first ; LS = cache |
| PAN-02 | P2 | Drift possible avant checkout | Toujours `validateAndMerge` serveur |

**Déjà bien :** Empty/skeleton/error ; checkout demo bloqué ; prix recalculés serveur.

### 3.4 Devis — 7,5/10

| ID | Sev | Finding | Reco |
|----|-----|---------|------|
| DEV-01 | P2 | Liste+détail ~710 L | Extraire panneau détail |
| DEV-02 | P3 | e2e PDF/email incomplets | Smoke |

**Déjà bien :** `/devis/[id]` → `/devis?id=` ; FlowBanner + next-action ; deep-link commande ; pagination 50.

### 3.5 Commandes — 8/10

| ID | Sev | Finding | Reco |
|----|-----|---------|------|
| CMD-01 | P2 | Hub 360 : peu de CTA SAV / reconfig POS | Liens `/reclamations?commande=` + POS |
| CMD-02 | P3 | Lien SAV générique | Deep-link `?commande=` |

**Déjà bien :** Hub `/commandes/[id]` ; pagination ; FlowBanner ; API gated.

### 3.6 Réclamations — 5,5/10 *(↑ depuis 4/10 post-V4 schéma)*

| ID | Sev | Finding | Reco |
|----|-----|---------|------|
| REC-01 | P1 | Liste n’affiche pas / ne lie pas la commande | `commande.numero` → `/commandes/[id]` |
| REC-02 | P1 | Pas de création sur `/reclamations` | Form + `commandeId` optionnel |
| REC-03 | P1 | Fetch fail → faux empty | ErrorState + retry |
| REC-04 | P2 | Zéro e2e SAV | Spec create → hub |
| REC-05 | P3 | Perm via `clients:*` seulement | Option `reclamations:*` |

**Déjà bien (V4) :** `ClientReclamation.commandeId` Prisma + API + filtre hub 360 + entrée menu commercial.

---

## 4. Orphelins / legacy (ne pas supprimer)

| Élément | Action |
|---------|--------|
| `/devis/[id]` redirect | Conserver |
| Group registry `commandes` = `gpao_production` | Override univers Commercial déjà OK |
| `ws_commercial` | Rester dans **Mon espace** |
| Clé panier legacy | Migration douce, pas delete |

---

## 5. Roadmap Commercial → 10/10

### Lot C-A — P0 dette POS (2–4 j)

1. Extraire `pos/[id]` (pricing / options / cart / gates)
2. Figer contrat `calculate.ts` + router familles

### Lot C-B — P1 flow SAV & listes (1–2 j)

1. Clients : pagination UI
2. Réclamations : liens hub + create + ErrorState + `commandeId` picker
3. Hub commande → CTA SAV

### Lot C-C — P1 panier server-first (1–2 j)

1. Vérité prix 100 % `/api/cart`
2. localStorage = cache / offline only

### Lot C-D — Assurance

1. Sanitize `price-preview`
2. e2e : client → POS → panier → devis → commande → réclamation
3. Découpage CRM / devis (P2)

---

## 6. Checklist validation 10/10 Commercial

- [ ] POS configurateur découpé (< ~400 L / module logique)
- [ ] Moteur pricing routé par famille
- [ ] Réclamation liée commande (UI + API)
- [ ] Listes clients / devis / commandes / SAV paginées avec contrôles
- [ ] Panier vérité serveur
- [ ] Marge uniquement avec `pos:view_margin`
- [ ] Deep-links bidirectionnels hub ↔ 6 modules
- [ ] e2e chaîne commerciale complète
- [ ] Badge parent ≠ confusion avec numéro d’étape (a11y : `aria-label` explicite)

---

## 7. Matrice « ne pas faire »

| Interdit | Pourquoi |
|----------|----------|
| Supprimer `/panier` ou legacy cart key | Zéro suppression |
| Grossir `calculate.ts` / `pos/[id]` | Dette P0 |
| SAV sans lien commande | Flow Client→…→Réclamations cassé |
| Exposer coûts internes sans `pos:view_margin` | Sécurité |

---

*Prochain lot suggéré : **C-A (POS extract)** ou **C-B (SAV UI)** selon priorité métier.*
