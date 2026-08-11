# ANS ORION — Audit approfondi : univers Pilotage

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-30 |
| Univers | **Pilotage** (sidebar ordre 1) |
| Sous-modules | Cockpit · Opérations · Rapports · Performance · Historique |
| Objectif | Collecte anomalies → roadmap **10/10** (direction imprimerie moderne) |
| Règle | Zéro suppression — masquer / rediriger / fusionner |
| Rapport global | `docs/audits/AUDIT_MODULES_COMPLET_2026-07-30.md` |

## Score Pilotage : 5,5 / 10

---

## 1. Périmètre & cartographie

| Module registry | Label | Route | Group registry | Univers sidebar |
|-----------------|-------|-------|----------------|-----------------|
| `cockpit` | Cockpit global | `/dashboard` (+ alias `/cockpit`) | `cockpit_direction` | Pilotage |
| `operations` | Opérations temps réel | `/operations` | `cockpit_direction` | Pilotage |
| `rapports` | Rapports & analyses | `/rapports` | `rapports_analyse` | Pilotage |
| `rapports_performance` | Performance machines & équipes | `/rapports/performance` | `rapports_analyse` | Pilotage |
| `historique` | Historique & Audit | `/historique` | `communication_marketing` ⚠️ | Pilotage (override) |

Ordre sidebar : `UNIVERSE_MODULE_ORDER.pilotage` =
`cockpit` → `operations` → `rapports` → `rapports_performance` → `historique`

### APIs clés

| API | Usage |
|-----|--------|
| `/api/dashboard/stats` | KPIs cockpit |
| `/api/cockpit/stats` | Variante cockpit (param `role` spoofable) |
| `/api/reports` | Rapports période |
| `/api/reports/export` | **UI appelle — route absente** |
| `/api/rapports/performance` | Machines & RH scores |
| `/api/audit` | Historique |

---

## 2. Scores par sous-module

| Sous-module | Score | Verdict |
|-------------|------:|---------|
| Cockpit `/dashboard` | **6,5** | Solide UI ; fuite marge + poll lourd |
| Opérations `/operations` | **5,5** | Deep-link commande cassé ; CA visible atelier |
| Rapports `/rapports` | **5,0** | Export mort ; masse salariale exposée |
| Performance `/rapports/performance` | **5,5** | Gate rôle incohérente ; charts non lazy |
| Historique `/historique` | **6,0** | Pagination OK ; `?commande=` orphelin |

---

## 3. Findings détaillés

### 3.1 Cockpit — 6,5/10

| ID | Sev | Type | Finding | Evidence | Reco | Effort |
|----|-----|------|---------|----------|------|--------|
| CK-01 | **P0** | security | KPI « Marge estimée » sans gate `pos:view_margin` côté API | `dashboard/page.tsx`, `api/dashboard/stats` | Strip marge API + masquer si `!canViewMargin` | M |
| CK-02 | P1 | duplicate | Onglet Ops du cockpit ≈ page `/operations` | `dashboard-header.tsx` | Synthèse légère + CTA vers `/operations` | M |
| CK-03 | P1 | perf | Polling 45s + stats lourdes | `dashboard/page.tsx` ~295 | KPIs summary only ; interval 60–90s | M |
| CK-04 | P1 | perf | `findMany` clients/paiements/factures peu bornés | `dashboard-stats.ts` | Aggregates SQL + plafonds | L |
| CK-05 | P2 | security | `?role=` spoofable sur `/api/cockpit/stats` | `cockpit/stats/route.ts` | Toujours `auth.role` | S |
| CK-06 | P2 | ux | Home dashboard pour rôles sans page-access clair | `dashboard-registry`, `page-access` | Rediriger non-direction vers `ws_*` | M |
| CK-07 | P2 | debt | Overlap Mon espace ↔ Pilotage | registry workspaces | Doc : Pilotage = direction | S |
| CK-08 | P3 | ok | Charts `dynamic()`, empty/error, cache slices 20s | dashboard + slices | Conserver | — |

**Déjà bien :** lazy charts, banners erreur, health score, deep-link paiements → `/commandes/{id}?tab=finance`, alias `/cockpit`.

---

### 3.2 Opérations — 5,5/10

| ID | Sev | Type | Finding | Evidence | Reco | Effort |
|----|-----|------|---------|----------|------|--------|
| OP-01 | **P0** | bug | Clic commande → `/commandes?id=` **ignoré** par la liste | `operations/page.tsx:138` vs `commandes/page.tsx` (pas de `id`) | `router.push(\`/commandes/${c.id}\`)` | S |
| OP-02 | P1 | security | CA mois / finance visibles production/designer/livraison | `page-access` + ops-realtime | Filtrer payload par rôle | M |
| OP-03 | P1 | missing | « Temps réel » sans refresh auto | load once | Bouton refresh + poll visibility 60s | S |
| OP-04 | P2 | duplicate | `RhPointagePanel` cockpit + ops | pages | Une surface + lien croisé | S |
| OP-05 | P2 | ux | Pas de FlowContextBanner / next-action | page ops | Ajouter bandeau flow | S |
| OP-06 | P3 | ok | Empty/error/retry + charts lazy | `operations/page.tsx` | Conserver | — |
| OP-07 | P3 | debt | `formatPrice` via `@/lib/data/catalogue` | import page | Utiliser helper prix hors catalogue | S |

**Déjà bien :** API `mode=operations`, file d’alertes, KPIs urgences/BAT/charge.

---

### 3.3 Rapports — 5,0/10

| ID | Sev | Type | Finding | Evidence | Reco | Effort |
|----|-----|------|---------|----------|------|--------|
| RP-01 | **P0** | missing | Bouton Export → `/api/reports/export` **sans route** | `rapports/page.tsx:90` ; seul `api/reports/route.ts` | Créer export + `rapports:export` + strip RH/marge | M |
| RP-02 | **P0** | security | `masseSalarialeBrute` / avances dans JSON ; strip marge incomplet | `reports-service.ts` ; UI L156 | Gate `rh:paie` ; strip pour non-autorisés | M |
| RP-03 | P1 | perf | `findMany` unbounded (paiements, commandes, employés, stock…) | `reports-service.ts:48-98` | Aggregates + take | L |
| RP-04 | P1 | ux | Nav demo → rapports mais page-access admin/manager | role-registry vs page-access | Aligner nav / perms / e2e | S |
| RP-05 | P2 | ux | Liens listes statut OK, peu de hub `/commandes/[id]` | page rapports | Top N → dossier | S |
| RP-06 | P2 | debt | Catch API → faux empty zeros | `api/reports/route.ts` | Distinguer erreur vs empty | S |
| RP-07 | P3 | ok | Filtre période, gate marge UI partielle, lien performance | page rapports | Conserver | — |

---

### 3.4 Performance machines & équipes — 5,5/10

| ID | Sev | Type | Finding | Evidence | Reco | Effort |
|----|-----|------|---------|----------|------|--------|
| PF-01 | P1 | bug | Page ouverte à `production` mais API exige `rapports:read` | page-access vs permissions | Aligner gates | S |
| PF-02 | P1 | perf | Charts import **statique** (pas lazy) | `rapports/performance/page.tsx` | `next/dynamic` | S |
| PF-03 | P2 | ux | Erreur = spinner peu clair | page | ErrorState + retry | S |
| PF-04 | P2 | security | Scores RH nominatifs pour tout `rapports:read` | performance-analytics-service | Restreindre nominatif direction | M |
| PF-05 | P3 | ok | Empty charts, lien `/rh/performance` | page | Conserver | — |
| PF-06 | P3 | missing | Peu d’e2e UI | e2e | Smoke + gate rôle | S |

**Déjà bien :** service machines + RH sans salaires dans ce payload.

---

### 3.5 Historique & Audit — 6,0/10

| ID | Sev | Type | Finding | Evidence | Reco | Effort |
|----|-----|------|---------|----------|------|--------|
| HI-01 | P1 | missing | `?commande=` next-action **non consommé** | `order-next-action.ts` vs `historique/page.tsx` | Lire param → filtre / deep-link | M |
| HI-02 | P1 | ux | Lignes non cliquables vers hub commande | historique page | Si entity Commande → `/commandes/[id]` | S |
| HI-03 | P2 | perf | Recherche sans debounce | page | Debounce 300 ms + AbortController | S |
| HI-04 | P2 | debt | Group registry `communication_marketing` vs Pilotage | `module-registry.ts:345` | Reclasser `rapports_analyse` / cockpit | S |
| HI-05 | P2 | duplicate | CM a aussi `historique` hors Pilotage | role-registry | Masquer pour CM ou scope audit | S |
| HI-06 | P3 | ok | Pagination limit 30, empty/error, `audit:read` | page + API | Conserver | — |
| HI-07 | P3 | missing | Zéro e2e historique | e2e | Smoke admin | S |

---

## 4. Orphelins / legacy (ne pas supprimer)

| Élément | Action recommandée |
|---------|-------------------|
| `/api/reports/export` (lien mort) | Implémenter **ou** masquer le bouton jusqu’au fix |
| Alias `/cockpit` → `/dashboard` | Conserver |
| Onglet Ops/Finance **dans** cockpit | Alléger → pointer `/operations` / ws finance |
| `historique` group `communication_marketing` | Reclasser group (override univers déjà Pilotage) |
| Nav rapports pour `demo` sans droit | Masquer modules sans permission |
| `roleParam` cockpit | Ignorer / déprécier |
| Deep-link `historique?commande=` | Brancher (HI-01) |

---

## 5. Performance — risques

| Risque | Localisation |
|--------|----------------|
| Multi-requêtes + ops extended dans dashboard full | `dashboard-stats.ts` |
| Reports : findMany sans plafond sur période year | `reports-service.ts` |
| Dashboard : `take: 500` commandes | `dashboard-stats.ts` |
| Polling 45s cockpit | dashboard page |
| Historique : refetch à chaque frappe | historique page |
| Performance : charts sync bundle | performance page |
| Ops : commandes semaine sans take | `ops-realtime-extended.ts` |

---

## 6. Roadmap Pilotage → 10/10

### Lot P-A — Sécurité & bugs P0 (0,5–1 j)

1. **OP-01** Deep-link `/commandes/[id]` depuis opérations  
2. **RP-01** Route export CSV + permissions  
3. **RP-02** Strip masse salariale / avances sauf RH/admin  
4. **CK-01** Strip marge dashboard API + UI gate  

### Lot P-B — Gates & cohérence (0,5 j)

1. CK-05 ignorer `roleParam`  
2. PF-01 / RP-04 aligner page-access ↔ nav ↔ permissions  
3. OP-02 filtrer CA pour rôles atelier  

### Lot P-C — Perf & UX (1–2 j)

1. Aggregates reports + dashboard  
2. Lazy charts performance ; debounce historique  
3. HI-01 / HI-02 deep-links audit → commande  
4. OP-03 refresh ops ; CK-03 poll plus léger  

### Lot P-D — Assurance

1. e2e : ops deep-link, historique, export, gates salaire/marge  
2. Réduire doublon cockpit ↔ ops  

---

## 7. Matrice « ne pas faire »

| Interdit | Pourquoi |
|----------|----------|
| Supprimer `/cockpit` ou historique | Zéro suppression / alias |
| Exposer salaires dans export CSV | RH |
| Deux cockpits métier (Pilotage + ws) | Confusion direction vs exécution |
| Polling permanent plus agressif | Perf |

---

## 8. Checklist validation 10/10 Pilotage

- [ ] Aucune fuite marge / salaires sans permission  
- [ ] Export rapports fonctionnel et gated  
- [ ] Clic ops / historique → hub `/commandes/[id]`  
- [ ] `?commande=` historique consommé  
- [ ] Listes / reports paginés ou agrégés  
- [ ] Charts lazy partout  
- [ ] e2e smoke ops + historique + export  
- [ ] Nav = permissions réelles (demo/prod)  

---

*Prochain module suggéré après correction Lot P-A : **Commercial** (ou enchaîner fix Pilotage si demandé).*
