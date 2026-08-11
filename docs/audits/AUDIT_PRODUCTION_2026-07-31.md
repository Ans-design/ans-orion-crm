# ANS ORION — Audit approfondi : univers Production

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Univers | **Production** (sidebar ordre 5) |
| Cible DOM | `SidebarUniverseNav` → « Production **54** » (`aria-expanded=false`) |
| Objectif | Collecte anomalies → roadmap **10/10** GPAO imprimerie moderne |
| Règle | **Zéro suppression** — masquer / rediriger / fusionner |

## Score Production : **6,4 / 10**

---

## 0. Lecture DOM « Production 54 »

| Observation | Interprétation |
|-------------|----------------|
| Chiffre **54** | Badge live **`tasksOpen`** = tâches métier ouvertes (`À faire` / `En cours` / `En pause` / `Bloquée`) — **tous métiers**, pas les OF ni dossiers GPAO |
| Clé | `MODULE_BADGE_KEYS.equipe_taches = 'tasksOpen'` |
| Biais UX | Un atelier peut voir 54 alors qu’une part est studio/commercial |

→ `aria-label` recommandé : « N tâches ouvertes » (pas « commandes »).

---

## 1. Cartographie & scores

| # | Module | Route | Score | Placement |
|---|--------|-------|------:|-----------|
| 1 | `gpao_dossiers` | `/production/dossiers` | **7,5** | Production |
| 2 | `production` | `/production` (+ `/gpao`, `/kanban`) | **6,5** | Production |
| 3 | `planning` | `/planning` | **6,5** | Production |
| 4 | `equipe_taches` | `/equipe/taches` | **6,0** | Production |
| 5 | `qualite` | `/production/qualite` | **7,0** | Production |
| 6 | `plan_matiere` | `/production/dechets` | **4,5** | Production |
| 7 | `ws_production` | `/workspace/production` | **5,0** | Mon espace |
| 8 | `ws_faconnage` | `/workspace/faconnage` | **5,0** | Mon espace |
| 9 | `ws_conducteur` | `/workspace/conducteur` | **5,5** | Mon espace |

---

## 2. Remédiation V4 — état

| Item | État |
|------|------|
| Pagination GPAO dossiers | **FIXED** (UI pageSize 25) |
| Planning pageSize 40 | **FIXED** |
| Qualité via étape « Contrôle qualité » | **FIXED** |
| Dual Production ↔ Dossier | **DOC only** — pas fusion UI |
| page-access `/production*` | **OPEN** (aucune règle) |

---

## 3. Findings par sévérité

### P0 / P0-métier

| ID | Finding | Reco |
|----|---------|------|
| PROD-MAT-01 | « Plan matière » = déchets + extrait commandes — **pas de BOM / besoin / conso réelle** | Renommer clairement **ou** brancher besoins ↔ stock |

### P1

| ID | Finding | Reco |
|----|---------|------|
| PROD-ACCESS-01 | Aucun `page-access` production/planning/tâches/workspaces | Aligner rôles atelier |
| PROD-NAV-01 | Opérateur sans `qualite` / `plan_matiere` en nav | Ajouter liens |
| PROD-PERF-01 | Kanban `/api/productions` sans pagination forcée UI | Forcer `paginated` |
| PROD-DUAL-01 | Dual OF kanban vs dossier 16 étapes | Banner « source = GPAO » + sync |
| PROD-DEC-01 | Déchets sans `?commande=` / FlowBanner | Deep-link + flow |
| PROD-WS-01 | Façonnage lien pointage → `/rh/employes` souvent admin-only | Lien poste adapté |
| PROD-COND-01 | Conducteur : charge locale, pas d’OF / étape Impression | Brancher GPAO |

### P2

| ID | Finding | Reco |
|----|---------|------|
| PROD-BADGE | Badge non filtré `type=production` | Scope ou dossiers en retard |
| PROD-PLAN | Planning monolithe ~1000 L ; pas FlowBanner ; pas OEE | Découper + capacité |
| PROD-TASK | Interval 1s timer ; take 100 silencieux | Optimiser |
| PROD-MODES | Modes workflow/calendar secondaires | Masquer (garder code) |

### P3

| ID | Finding | Reco |
|----|---------|------|
| PROD-ALIAS | `/gpao`, `/kanban` | Conserver redirects |
| PROD-EMOJI | UI déchets | Harmoniser design system |
| PROD-LIVE | Badge « LIVE » conducteur cosmétique | Retirer ou brancher |

---

## 4. Overlaps (ne pas supprimer)

| Zone | Action |
|------|--------|
| `/production` vs `/production/dossiers` | Canon = dossiers 16 étapes ; kanban = vue atelier |
| Planning vs calendrier production | Unifier deep-links |
| Tâches vs étapes GPAO | Une source d’avancement |
| `ws_*` dans order-list Production | Affichés Mon espace — documenter |
| Aliases `/gpao` `/kanban` | Conserver |

---

## 5. Besoins GPAO moderne

1. OF clair lié dossier + machine  
2. Charge prévisionnelle / capacité machines  
3. Plan matière réel (BOM → réservation → conso)  
4. Fiche fabrication branchée UX  
5. Consommation stock en fin d’étape  
6. Qualité AQL / échantillonnage (option)  
7. Badge atelier = dossiers en retard (pas tâches globales)

---

## 6. Roadmap → 10/10

1. **S-A** — page-access + nav opérateur qualité  
2. **S-B** — pagination kanban + clarifier dual E1  
3. **S-C** — plan matière réel ou rename + deep-link déchets  
4. **S-D** — badge scoped + découpe planning + e2e atelier

---

## 7. Checklist 10/10 Production

- [ ] page-access = permissions atelier  
- [ ] Kanban & dossiers paginés / liés  
- [ ] Source d’avancement unique (GPAO)  
- [ ] Plan matière ↔ stock  
- [ ] CQ accessible opérateur  
- [ ] Charge machine prévisionnelle  
- [ ] Badge parent compréhensible  
- [ ] e2e : commande → dossier → étape → CQ → fin  
- [ ] Aucune route alias supprimée

---

*Téléchargeable — suite : Communication, Logistique, Finance.*
