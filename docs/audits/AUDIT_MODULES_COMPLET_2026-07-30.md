# ANS ORION — Audit modules complet (imprimerie moderne)

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-30 |
| Périmètre | 11 univers sidebar + sous-modules opérationnels |
| Méthode | Analyse code + routes + APIs + audits V3 antérieurs |
| Objectif | Collecte anomalies / dettes / orphelins / perfs → roadmap 10/10 |
| Règle | **Zéro suppression métier** — masquer / rediriger / fusionner |

**Score global pondéré : 6,4 / 10**  
Cible imprimerie moderne : **10/10** (parcours fluide, prix fiables, hub commande, latence basse, rôles stricts).

---

## 1. Synthèse exécutive

### Scores par univers

| # | Univers | Score | Verdict |
|---|---------|------:|---------|
| 1 | Pilotage | 6,0 | Rapports lourds ; fuite masse salariale |
| 2 | Commercial | 6,4 | Hub commande fort ; POS monolithe ; SAV faible |
| 3 | Stock & Achats | 6,0 | Pas de pagination stock ; lien matière faible |
| 4 | Studio & BAT | 5,5 | `/bat` public ; sync client→GPAO manquante |
| 5 | Production | 6,0 | Double modèle Production vs Dossier GPAO |
| 6 | Communication | 7,0 | FAB OK ; polling FAB trop agressif |
| 7 | Logistique | 6,5 | Pas de CTA facture post-livraison |
| 8 | Finance | 6,5 | Gates OK ; UI livraison→facture manquante |
| 9 | RH | 7,0 | Écriture paie OK ; lecture manager trop large |
| 10 | Administration | 7,0 | Macros OK ; legacy micro-pages ; take 5000 |
| 11 | Mon espace | 7,0 | Complet mais bruyant pour admin |

### Top 12 priorités (P0 → P1)

| ID | Sévérité | Univers | Titre |
|----|----------|---------|-------|
| BAT-P0-01 | **P0** | Studio | `/bat` listé dans `PUBLIC_PAGES` — accès sans auth |
| BAT-P0-02 | **P0** | Studio | Validation client BAT sans `syncGpaoOnProofStatus` |
| POS-P0-01 | **P0** | Commercial | Configurateur `pos/[id]` ~2609 L — dette bloquante |
| POS-P0-02 | **P0** | Commercial | `calculate.ts` ~921 L multi-moteurs — ne plus grossir |
| REC-P0-01 | **P0** | Commercial | Réclamations sans `commandeId` + hors menu commercial |
| TALK-P1-01 | **P1** | Communication | FAB force polling 8s (hors messagerie) |
| LIV-P1-01 | **P1** | Logistique | Pas de CTA « Générer facture » après Livré |
| STK-P1-01 | **P1** | Stock | `listStockItems` charge tout le stock (×2 KPI) |
| GPAO-P1-01 | **P1** | Production | Double modèle `Production` vs `ProductionDossier` |
| PREP-P1-01 | **P1** | Studio | Prépresse checklist locale non persistée |
| RH-P1-01 | **P1** | RH | Manager lit grille paie complète |
| RPT-P1-01 | **P1** | Pilotage | `/api/reports` 12× findMany + masse salariale exposée |

### Points déjà solides (ne pas casser)

- Hub `/commandes/[id]` + next-action + bandeau univers
- FAB ANS Talk → `/messagerie` uniquement (pas de panneau flottant)
- Gate Administration (`canAccessAdministration`)
- E2E smoke 16/16 + chaîne commerciale helpers
- Correctif livres intérieur 0 Ar (mixte false-positive)
- Centre sync + Catalogue 2026 apply / drift
- Lazy CPS / kanban production
- Zéro suppression + aliases legacy conservés

---

## 2. Commercial (score agrégé 6,4)

### 2.1 Clients / CRM — 6,5/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| CRM-01 | P1 | debt | Monolithe liste+fiche ~1792 L | `components/clients/clients-page.tsx` | Découper list / detail / form |
| CRM-02 | P1 | perf | Liste sans pageSize serveur explicite | fetch `/api/clients` | Pagination forcée |
| CRM-03 | P2 | missing | Réclamation fiche sans lien commande | onglet reclamations | `commandeId` optionnel |
| CRM-04 | P3 | duplicate | Stats réclamations + summary clients | 2 endpoints | Unifier overview CRM |

### 2.2 Catalogue POS — 5,5/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| POS-01 | P0 | debt | Page configurateur ~2609 L | `app/(app)/pos/[id]/page.tsx` | Extraire pricing / GF / cart / gates |
| POS-02 | P0 | debt | Moteur pricing monolithe | `lib/pricing/calculate.ts` | Router par famille |
| POS-03 | P1 | bug | Historique 0 Ar intérieur livres (corrigé 2026-07-30) | `publication-core.ts` | Smoke e2e + garde-fous |
| POS-04 | P1 | duplicate | 3 chemins prix (simulate / preview / alias) | `use-pos-server-price.ts` | Un contrat API |
| POS-05 | P2 | security | Vérifier non-fuite coûts sans `pos:view_margin` | `/api/pricing/simulate` | Strip coût côté API |
| POS-06 | P2 | ux | Cache `.next` corrompu → HTML brut / « Vérification profil… » | logs chunks 404 | `dev:clean` documenté |

### 2.3 Panier — 7/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| PAN-01 | P1 | debt | Dual localStorage + `/api/cart` | `cart-store.ts`, `use-cart.ts` | Server-first |
| PAN-02 | P1 | bug | Drift prix local vs serveur au merge | validateAndMerge | Toujours recalcul serveur |
| PAN-03 | P3 | orphan | Clé legacy `ans_orion_cart` | LEGACY_CART_KEY | Migration one-shot |

### 2.4 Devis — 7,5/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| DEV-01 | P2 | debt | Liste+détail ~710 L | `devis/page.tsx` | Extraire détail |
| DEV-02 | P1 | missing | Hub → `/devis?id=` pas de route `/devis/[id]` | integration-hub | Route canonique |
| DEV-03 | P2 | missing | e2e PDF/email incomplets | commercial helpers | Smoke PDF |

### 2.5 Commandes hub — 8/10 *(meilleur du commercial)*

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| CMD-01 | P1 | missing | SAV = toutes réclamations client | `commande-360-service.ts` | Filtrer / lier `commandeId` |
| CMD-02 | P2 | missing | Hub sans lien POS reconfigure / SAV | `commande-integration-hub.tsx` | Ajouter liens |
| CMD-03 | P3 | duplicate | next-action vs order-next-action | `lib/flow` + `lib/commande` | Source unique |

### 2.6 Réclamations — 4/10 *(priorité métier SAV)*

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| REC-01 | P0 | missing | Pas de `commandeId` Prisma | `ClientReclamation` | Migration + UI |
| REC-02 | P0 | orphan | Absent menu commercial | `role-registry.ts` | Ajouter au flow vente |
| REC-03 | P1 | missing | Liste sans création + take 100 | `reclamations/page.tsx` | CTA + pagination |
| REC-04 | P1 | missing | Zéro e2e SAV | `e2e/**` | Spec create→statut |

---

## 3. Administration — 7/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| ADM-01 | P1 | debt | ~30 micro-pages legacy encore en macros | `admin-macro-modules.ts` | Regrouper / `hidden` |
| ADM-02 | P1 | perf | Liste matières unifiée `take: 5000` | `base-material-price-unified.service.ts` | Pagination |
| ADM-03 | P1 | missing | Drift Stock↔BaseMaterial / BAT↔GPAO faible | `sync-drift-service.ts` | Checks dédiés |
| ADM-04 | P2 | perf | Badges overview poll 180s | `use-admin-macro-badge-counts.ts` | Refresh on focus |
| ADM-05 | P2 | orphan | `flux-statuts` alias `production-flux` | redirects | Doc menu unique |
| ADM-06 | P2 | debt | `BaseMaterialsTable` @deprecated encore présent | composant | Masquer import |
| ADM-07 | P2 | ux | Double entrée config matières vs inventaire `/stock` | redirects | Labels clairs |

**Ne pas supprimer** : aliases `/admin-control`, `/admin/pricing`, piles backoffice-v2.

---

## 4. Stock & Achats — 6/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| STK-01 | P1 | perf | Charge tout le stock actif ×2 KPI | `stock.service.ts` | Pagination + SQL agrégé |
| STK-02 | P1 | missing | API `link-material` peu branchée UI | `StockItemCompleteModal` | Picker BaseMaterial |
| STK-03 | P1 | perf | Formulaire achats charge `/api/stock` complet | `achats/page.tsx` | Autocomplete `?q=` |
| STK-04 | P2 | missing | Achats sans `?commande=` | page achats | Aligner hub 360 |
| STK-05 | P2 | duplicate | Vue stock aussi via CPS admin | redirects | Banner vers `/stock` |

---

## 5. Studio & BAT — 5,5/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| BAT-01 | **P0** | bug | `/bat` dans `PUBLIC_PAGES` | `middleware.ts` | Public = `/bat/valider/*` seulement |
| BAT-02 | **P0** | bug | Accept client sans sync GPAO | `api/bat/client/[token]` | Appeler `syncGpaoOnProofStatus` |
| BAT-03 | P1 | missing | Prépresse non persisté | `studio-prepresse-panel.tsx` | Persister + jalon GPAO |
| BAT-04 | P2 | ux | Prépresse sans filtre `?commande=` | panel | Deep-link |
| BAT-05 | P3 | orphan | Routes briefs/fichiers/prepresse = redirects | pages | Conserver |

---

## 6. Production / GPAO — 6/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| GPAO-01 | P1 | duplicate | `Production` API vs `ProductionDossier` | `/api/productions` vs dossiers | Sync ou UI unique |
| GPAO-02 | P1 | missing | Auto-création dossier pas garantie | `syncDossierForCommande` | À confirmation commande |
| GPAO-03 | P1 | perf | Planning charge commandes pageSize 100 + slots | `planning/page.tsx` | Pool filtré / lazy semaine |
| GPAO-04 | P1 | ux | Qualité filtrée sur statut commande ≠ étape CQ GPAO | `qualite/page.tsx` | Source = dossiers étape CQ |
| GPAO-05 | P2 | perf | Liste dossiers `take: 100` | `gpao-dossier-service.ts` | Cursor |

---

## 7. Communication — 7/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| COM-01 | P1 | perf | FAB `pollingActive=true` → reload ~8s | `floating-messenger-bubble.tsx` | Badge SSE seul hors messagerie |
| COM-02 | P2 | security | Campagnes/relances = `clients:read/write` | `api/cm/*` | Permission `cm:*` |
| COM-03 | P2 | debt | Prop `compact` / shell mini-panel dormant | `ans-talk-app.tsx` | Ne jamais réactiver panneau |
| COM-04 | P3 | missing | Aide compte articles via `CATALOGUE` TS | `aide/page.tsx` | Count DB |

**Conforme** : FAB → `/messagerie` plein écran.

---

## 8. Logistique — 6,5/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| LOG-01 | P1 | missing | Pas de CTA facture après Livré | `livraisons/page.tsx` | Toast + `/factures?commande=` |
| LOG-02 | P2 | bug | FlowBanner statut filtre vs réel | page livraisons | Passer statut sélection |
| LOG-03 | P2 | bug | Clé `Livrée` vs `Livré` | `next-action.ts` | Unifier |
| LOG-04 | P3 | ux | Preuve obligatoire OK mais peu guidée | service livraisons | UX avant confirmer |

---

## 9. Finance — 6,5/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| FIN-01 | P1 | missing | next-action facture OK, UI livraison non branchée | livraisons + next-action | Brancher CTA |
| FIN-02 | P2 | security | Charges GET = `factures:read` trop large | `api/finance/charges` | Permission finance |
| FIN-03 | P2 | security | Masse salariale dans rapports (voir Pilotage) | reports-service | Strip sauf RH/admin |
| FIN-04 | P3 | ux | Flow Livré→facture documenté, pas UI détail | FLOW_GLOBAL | CTA hub + livraison |

---

## 10. Pilotage — 6/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| PIL-01 | P1 | perf | `/api/reports` 12× findMany sans plafond | `reports-service.ts` | Aggregates + cache TTL |
| PIL-02 | P2 | security | `masseSalarialeBrute` visible si `rapports:read` | stripMargin incomplet | Gate RH/admin |
| PIL-03 | P2 | perf | Workspace commercial recharge même rapport | `workspace/commercial` | Endpoint KPI léger |
| PIL-04 | P3 | perf | Dashboard poll 45s | `dashboard/page.tsx` | OK si charts pas rechargés |

---

## 11. RH — 7/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| RH-01 | P1 | security | `requireRhAdmin` = admin **ou** manager → paie lisible | `rh-access.ts` | Lecture montants = admin |
| RH-02 | P2 | debt | PATCH mixtes `users:manage` vs `requireRh*` | APIs RH | Uniformiser |
| RH-03 | P2 | security | Démo block incomplet sur `/api/rh` | `isDemoBlockedRoute` | Étendre |

---

## 12. Mon espace — 7/10

| ID | Sev | Type | Finding | Evidence | Reco |
|----|-----|------|---------|----------|------|
| WS-01 | P2 | ux | Admin voit tous les `ws_*` (bruit) | `role-registry.ts` | Favoris / utiles seulement |
| WS-02 | P2 | perf | `ws_commercial` → `/api/reports` lourd | workspace commercial | KPIs légers |
| WS-03 | P3 | debt | Dashboards minces | `workspace/*` | Next-action par rôle |

---

## 13. Transverse (qualité / perf / orphelins)

| Thème | État | Action |
|-------|------|--------|
| Monolithes | POS, calculate, clients, planning | Découpage progressif (pas rewrite) |
| Prix 0 Ar | Livres corrigé ; grilles Excel entry OK | Smoke e2e + apply Catalogue 2026 en DB |
| Polling | FAB 8s mauvais ; badges admin 180s ; dashboard 45s OK | Restreindre FAB |
| Pagination | Stock / matières / dossiers / SAV | Server-side partout >50 |
| Deep-links `?commande=` | Forts POS/stock/prod/bat ; faibles SAV/achats | Compléter |
| Rôles | Admin gate OK ; RH/CM/charges trop larges | Permissions fines |
| Legacy / orphelins | Aliases OK ; micro-admin ; cart key ; compact Talk | Masquer, ne pas supprimer |
| Cache Next | Chunks 404 → UI brute | `npm run dev:clean` + `dev:local` |
| e2e | Smoke OK ; SAV / BAT client / livraison→facture absents | Étendre specs |
| Docs | FLOW_GLOBAL, USER_JOURNEYS, sync | Tenir à jour après chaque lot |

---

## 14. Roadmap vers 10/10 (lots recommandés)

### Lot A — Sécurité & conformité (P0) — 1–2 j

1. Restreindre `PUBLIC_PAGES` BAT  
2. Sync GPAO sur validation client BAT  
3. Strip salaires / coûts API selon rôle  
4. Lecture paie admin-only  

### Lot B — Flow métier fermé (P0–P1) — 2–3 j

1. `commandeId` sur réclamations + menu commercial  
2. CTA facture post-livraison + hub  
3. Auto-dossier GPAO à confirmation  
4. Prépresse persisté  

### Lot C — Performance (P1) — 2–3 j

1. Pagination stock / matières / dossiers  
2. FAB Talk badge-only hors messagerie  
3. `/api/reports` agrégats + cache  
4. Achats autocomplete stock  

### Lot D — Architecture progressive (P1–P2) — multi-sprints

1. Extraire POS `[id]` (pricing / cart / GF)  
2. Router calculate par famille  
3. Unifier Production ↔ Dossier ou sync bidirectionnelle  
4. Server-first panier  

### Lot E — Qualité & assurance (continu)

1. e2e : livres intérieur >0 · SAV · BAT client · livraison→facture  
2. Audit Catalogue 2026 apply en local/prod  
3. Passer modules 1 à 1 (ce document = backlog)  

---

## 15. Matrice « à ne pas faire »

| Interdit | Pourquoi |
|----------|----------|
| Supprimer routes/modules legacy | Règle zéro suppression |
| Réactiver panneau flottant Talk | Règle ANS Talk |
| Inventer prix Madagascar hors Excel | SoT Catalogue 2026 / grilles |
| Rewrite POS from scratch | Remplacer monolithe par extraction |
| `--prod` Vercel sans validation | Déploiement contrôlé |

---

## 16. Annexes

- Carte modules : `docs/MODULES_MAP.md`
- Flow global : `docs/FLOW_GLOBAL.md`
- Matrice V3 : `docs/audits/ANS_ORION_REMEDIATION_MATRIX_2026-07-30.md`
- Sidebar Admin/Commercial : `docs/audits/AUDIT_SIDEBAR_ADMIN_COMMERCIAL_2026-07-30.md`
- Sync : `docs/SYNC_MATRIX.md`

---

*Document généré pour téléchargement / suivi. Prochaine étape suggérée : traiter le Lot A (P0 sécurité BAT + RH/rapports), puis enchaîner module par module selon ce backlog.*
