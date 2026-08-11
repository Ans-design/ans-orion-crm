# ANS ORION V3 — Matrice de remédiation

**Date :** 2026-07-30  
**Baseline :** `docs/audits/ANS_ORION_V3_BASELINE.md`  
**Pré-remédiation :** `docs/audits/ANS_ORION_V3_PRE_REMEDIATION.md`

| ID | Constat | Preuve initiale | Fichiers modifiés | Correction | Tests | Résultat | Statut |
|----|---------|-----------------|-------------------|------------|-------|----------|--------|
| V3-S1 | Admin sidebar sans filtre | `buildSidebarUniverses` toujours push | `build-sidebar-universes.ts`, `can-access-administration.ts` | Gate `canAccessAdministration` | sidebar-admin-access | 14 tests OK | **TESTÉ** |
| V3-S2 | MacroNav sans gate | mappe toutes macros | `AdministrationMacroNav.tsx` | `macros=[]` → `null` | sidebar-admin-access | OK | **TESTÉ** |
| V3-S3 | Liens Admin → non-autorisé | page-access admin\|manager | idem S1 | menu absent du DOM | unit | OK | **TESTÉ** |
| V3-S4 | canAccessAdmin inutilisé nav | permission-matrix | `can-access-administration.ts` | décide via `canAccessPage` | unit alignement | OK | **TESTÉ** |
| V3-C1/C2 | Flow 1–6 / confusion badge | flow-step + SidebarBadge | `sidebar-universe-nav.tsx`, `sidebar-modern.css` | étapes visibles + a11y + style distinct | sidebar-admin-access | OK | **TESTÉ** |
| V3-C3 | Réclamations hors commercial | role-registry | docs USER_JOURNEYS | **pas** d’ajout permission (attente métier) ; numérotation 1→5 | unit | OK | **CORRIGÉ** (UX) / **action humaine** |
| V3-D1 | Docs 6 vs 7 macros | MODULES_MAP | MODULES_MAP, USER_JOURNEYS | 7 macros documentées | — | — | **CORRIGÉ** |
| V3-D2 | Badge parent Admin = 0 | items [] | `sumAuthorizedAdminMacroBadges`, sidebar-universe-nav | agrégation clés uniques | unit | OK | **TESTÉ** |
| V3-A1–A3 | P0 sécu V2 | baseline | — | revalidé tests p0/lot4 | 23+ | OK | **DÉJÀ CORRIGÉ** |
| V3-P1 | prixDepart seed | catalogue 99 | — | runtime déjà sans fallback | pos-catalog-entry | OK | **DÉJÀ CORRIGÉ** |
| V3-K1 | En attente stock | rule | — | — | stock-attente | OK | **DÉJÀ CORRIGÉ** |
| V3-E2 | E2E smoke | — | — | rejoué post-P0 | test:e2e:smoke | **16/16** | **TESTÉ** |
| V3-E4 | E2E chaîne métier | mission §14 | `e2e/full-business-chain.spec.ts`, `e2e/helpers/commercial.ts` | POS client→flyer→panier→devis→CMD→BAT→livraison→facture→paiement | playwright full-business-chain | **3/3** | **TESTÉ** |
| V3-M1 | POS monolithe | 2751 L | — | hors lot P0 | — | — | **CONFIRMÉ** dette P2 |
| V3-ORG | Hub org /admin/permissions | audit | `admin-macro-modules`, redirects | Hub → `/administration/roles-permissions` ; `/admin/permissions` reste micro legacy | admin-macro-fusion | OK | **TESTÉ** |
| V3-MODEL | modeles-articles hors macros | audit | `admin-macro-modules`, `admin-nav-config.json` | Micro Formules + discoverability | admin-nav-discoverability | OK | **TESTÉ** |
| V3-E3 | Deny Admin sidebar E2E | mission §13 | `e2e/sidebar-admin-gate.spec.ts`, auth helpers, RH gate E2E | commercial/démo sans Admin ; ADM01 voit Admin | playwright sidebar-admin-gate | **6/6** | **TESTÉ** |
| V3-BUILD | Build production | mission §14 | `.next-build` | `NEXT_DIST_DIR=.next-build npm run build` | build | OK | **TESTÉ** |

## Note provisoire

**~9,5/10** — P0/P1 + gate Admin + smoke + **chaîne métier E2E** verts ; build OK. Pas 10/10 : matrice V29 incomplète (OPE01/FIN01…), monolithe POS `[id]`, décision humaine Réclamations dans le flow commercial.
