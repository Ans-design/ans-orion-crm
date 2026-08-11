# ANS ORION — Audit approfondi : univers Studio & BAT

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-31 |
| Univers | **Studio & BAT** (sidebar ordre 4) |
| Cible DOM | `SidebarUniverseNav` → bouton « Studio & BAT » (`aria-expanded=false`) |
| Objectif | Collecte anomalies → roadmap **10/10** studio imprimerie moderne |
| Règle | **Zéro suppression** — masquer / rediriger / fusionner |
| Remédiation V4 | A1 public BAT, B1 sync GPAO, B2 prépresse persisté — **largement FIXED** |

## Score Studio & BAT : 6,8 / 10

Progression depuis 5,5 le 2026-07-30 grâce à V4 ; plafonné par permissions designer + GED faible.

---

## 0. Lecture DOM « Studio & BAT »

| Observation | Interprétation |
|-------------|----------------|
| Pas de chiffre collé | Aucun `MODULE_BADGE_KEYS` pour modules studio (pas de badge live parent) |
| Univers replié | `aria-expanded="false"` |
| Groupe `[3]` | 4ᵉ univers |

Ordre canonique :

1. Studio hub → 2. Briefs → 3. Fichiers → 4. Conception → 5. BAT → 6. Prépresse → 7. Mon studio (`ws_studio` → Mon espace)

---

## 1. Scores par sous-module

| # | Module | Route | Score | Verdict |
|---|--------|-------|------:|---------|
| 1 | `studio_hub` | `/studio` | **7,0** | Hub OK ; pas de FlowBanner |
| 2 | `studio_briefs` | `/studio/briefs` → `?tab=briefs` | **7,0** | Versions V1–V5 ; livrer≠GPAO |
| 3 | `studio_fichiers` | `/studio/fichiers` → `?tab=fichiers` | **5,0** | Ignore `?commande=` ; upload ID manuel |
| 4 | `conception` | `/pos/conception` | **6,5** | Module POS dans univers Studio |
| 5 | `bat` | `/bat` + `/bat/valider/[token]` | **7,0** | Sync GPAO OK ; **designer bloqué write** |
| 6 | `prepresse` | `/studio/prepresse` → `?tab=prepresse` | **6,5** | Checklist DB OK ; filtre fichiers cassé |
| 7 | `ws_studio` | `/workspace/studio` | **7,5** | Cockpit graphiste clair |

---

## 2. Remédiation V4 — confirmation

| ID | Audit ancien | État 2026-07-31 | Preuve |
|----|--------------|-----------------|--------|
| BAT-P0-01 | `/bat` public | **FIXED** | `public-routes.ts` — seul `/bat/valider/*` |
| BAT-P0-02 | Accept client sans GPAO | **FIXED** | `api/bat/client/[token]` + `syncGpaoOnProofStatus` |
| PREP-P1 | Checklist locale | **FIXED** (DB) | `StudioPrepressCheck` + jalon GPAO |
| Drift BAT↔GPAO | Faible | **FIXED** | `sync-drift-service` |

---

## 3. Findings par sévérité

### P0

| ID | Finding | Evidence | Reco |
|----|---------|----------|------|
| STU-SEC-01 | **Designer a `bat:write` mais les APIs proofs exigent `production:write`** → création / envoi / lien client impossibles | `permissions.ts` designer vs `api/proofs/**` | Autoriser `bat:write` **ou** scope `production:write` BAT-only |

### P1

| ID | Finding | Reco |
|----|---------|------|
| STU-FILE-01 | `StudioFichiersPanel` ignore `?commande=` | Propager `commandeId` depuis hub |
| STU-PREP-01 | Prépresse fetch `?commande=` mais API attend `commandeId` | Unifier query |
| STU-PREP-02 | ✓/✗ fichier prépresse = Set React non persisté | Persister ou retirer faux contrôles |
| STU-BRIEF-01 | Action `livrer_production` sans `syncGpao` | Brancher sync |
| STU-BAT-01 | `POST client-link` change statut **sans** `syncGpaoOnProofStatus` | Appeler sync |
| STU-FLOW-01 | `/studio` sans FlowContextBanner / next-action | Ajouter bandeau |
| STU-ACCESS-01 | `/studio` et `/bat` absents de page-access → tout connecté | Restreindre rôles studio |

### P2

| ID | Finding | Reco |
|----|---------|------|
| STU-PERF-01 | Double fetch stats hub + briefs | Une source |
| STU-PERF-02 | KPIs BAT calculés sur `take:100` | Aggregates count |
| STU-DOC-01 | `STUDIO_BAT_FLOW.md` ≠ `BRIEF_STATUTS` | Resync doc |
| STU-VER-01 | Deux versionings (ProofVersion vs StudioCreativeVersion) | Documenter / mapper |
| STU-UX-01 | Pas de galerie / preview studio / preflight auto | Roadmap |
| STU-UX-02 | Upload = briefId cuid manuel | Sélecteur brief/commande |
| STU-CONC | Conception POS dans univers Studio (confusion) | Label « POS Conception » |
| STU-DUP | Checklist dans briefs **et** prépresse | Une UI source |

### P3

| ID | Finding | Reco |
|----|---------|------|
| STU-REDIR | Routes briefs/fichiers/prépresse = redirects | **Conserver** (aliases) |
| STU-NAV | Nav graphiste sans `studio_hub` | Optionnel |
| STU-HIDE | Doublons sidebar hub vs 3 liens | Candidats `status: hidden` (garder routes) |
| STU-TOKEN | Token dans JSON client-link | OK staff ; documenter |

---

## 4. Détail modules

### 4.1 Studio hub `/studio` — 7,0

~118 LOC + panels tabs. Deep-link commande OK. Manque FlowBanner ; KPIs doublonnés.

### 4.2 Briefs — 7,0

Redirect + panel ~189 L. Auto-création à confirmation commande. Versions créatives V1–V5. Empty OK ; ErrorState faible. `livrer_production` incomplet GPAO.

### 4.3 Fichiers — 5,0

GED table only ; pas de filtre commande ; pas de galerie ; overlap avec `CommandeFichiersBatPanel`.

### 4.4 Conception `/pos/conception` — 6,5

~629 LOC configurateur POS. Utile vente ; peu lié BAT. Conserver dans Studio avec label clair.

### 4.5 BAT — 7,0

**Déjà bien :** portail client token HMAC, sync GPAO validation, FlowBanner, deep-link `?commande=`, empty/error, versions Proof.

**Ouvert :** P0 permissions designer ; client-link sans sync GPAO ; KPIs sur échantillon.

### 4.6 Prépresse — 6,5

Checklist 8 items persistée DB + score 100% → jalons GPAO. Bugs filtre fichiers + validations locales. Pas de preflight DPI/bleed/PDF-X.

### 4.7 Mon studio — 7,5

Cockpit designer ; liens statut ; ErrorBanner. Placement Mon espace OK.

---

## 5. Overlaps / orphelins (ne pas supprimer)

| Élément | Action |
|---------|--------|
| `/studio/briefs`, `/fichiers`, `/prepresse` redirects | **Conserver** |
| Doublon nav hub vs 3 entrées | Masquer entrées redondantes si hub suffit |
| Fichiers studio vs fichiers commande | Unifier deep-link ; garder les deux surfaces |
| ProofVersion vs StudioCreativeVersion | Doc 2 cycles (créa vs BAT client) |
| `/pos/conception` | Conserver ; clarifier label |
| `/bat/valider/*` public | Conserver strictement ce scope |

---

## 6. Besoins d’ajout (studio imprimerie moderne)

1. Aligner droits designer ↔ APIs BAT (**bloquant**)  
2. Galerie fichiers + preview + download  
3. Preflight technique (résolution, fond perdu, espaces colorimétriques)  
4. Timeline commentaires client BAT  
5. Révocation / renouvellement lien BAT  
6. Compare versions créatives  
7. CTA « Créer BAT depuis brief validé »  
8. FlowBanner 4 questions sur hub studio  

---

## 7. Roadmap → 10/10

### Lot B-A — P0 permissions (0,5 j)

- proofs API accepte `bat:write` **ou** permission dédiée ; tests négatifs designer

### Lot B-B — P1 GED & prépresse (1 j)

- `commandeId` fichiers + fix query prépresse + persist contrôles fichier
- sync GPAO client-link + livrer_production

### Lot B-C — P1 UX flow (0,5–1 j)

- FlowBanner `/studio` ; page-access studio/bat
- sélecteur brief à l’upload

### Lot B-D — modern studio (P2)

- Galerie, preflight, timeline client, e2e BAT client + designer

---

## 8. Checklist 10/10 Studio & BAT

- [ ] Designer opère BAT de bout en bout (créer → lien → validation)
- [ ] Seul `/bat/valider/*` public (déjà)
- [ ] Toute validation client / interne sync GPAO
- [ ] Fichiers filtrables par commande partout
- [ ] Prépresse = source unique checklist + preflight
- [ ] FlowBanner hub studio
- [ ] page-access aligné rôles
- [ ] Galerie / preview professionnel
- [ ] e2e : brief → fichiers → prépresse → BAT → GPAO
- [ ] Aucune route alias supprimée

---

## 9. Matrice synthèse

| Module | Auth API | Deep-link | Flow | GPAO | Score |
|--------|----------|-----------|------|------|------:|
| hub | bat:* | oui | non | indirect | 7,0 |
| briefs | bat:* | oui | non | partiel | 7,0 |
| fichiers | bat:* | **non** | non | upload | 5,0 |
| conception | pos | faible | non | n/a | 6,5 |
| bat | production:* / token | oui | **oui** | **oui** | 7,0 |
| prépresse | bat:* | partiel | non | checklist | 6,5 |
| ws_studio | cockpit | liens | n/a | n/a | 7,5 |

---

*Document téléchargeable — paire : `AUDIT_STOCK_ACHATS_2026-07-31.md`.*
