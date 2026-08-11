# AUDIT — Reconstruction Admin Catalogue / Matières / Prix / Sync POS

**Référence :** `docs/references/ULTRA_PROMPT_REFONTE_ADMIN_PRIX_MATIERES_SYNC_POS_ANS_CRM_V3.txt`  
**Date :** 2026-07-15  
**Statut :** UX 6 domaines + §7/§8/§12/§13 faits ; §14 cycles/contradictions livrés ; phases profondes restantes §5

---

## 0. Cartographie des phases (prompt) — état

| § / Étape | Contenu | État |
|-----------|---------|------|
| §3 Nav 6 domaines | Information architecture | **Fait** |
| §5 Produits & publication | Fiche unique, filtres pub. | **Partiel** (liste/filtres OK ; sections fiche à enrichir) |
| §6 Matières | 6 sous-vues + presets colonnes | **Partiel** (vues + profil 10 sections OK ; Excel multi-feuilles manque) |
| §7 Modèle financier | marge ≠ marque | **Fait** (`financial-definitions` + simulateur) |
| §8 Compléter catalogue | preview → confirm → apply | **Fait** (`analyze-catalog` / `apply-catalog`) |
| §9 Studio Prix | nav, formules, versions, sim | **Partiel** (no-code OK ; bulk tarifs / scénarios CI manquent) |
| §10 Contrat calcul | pricingResolver unique | **Existant** + sim API ; contrat doc à formaliser davantage |
| §11 Sync Admin↔POS | publication atomique | **Partiel** (hash projection + garde deps à la pub ; transaction globale multi-entités à étendre) |
| §12 Matières↔Produits↔POS | états usage matière | **Fait** (dérivé + UI sélecteur / profil) |
| §13 Diagnostics | parité + drift | **Fait** (centre 3 onglets) |
| §14 Options / dépendances | constructeur SI/ALORS | **Fait** (panel + validation cycles/contradictions) |
| §15 Excel | preview / idempotence | **Partiel** (pipelines existants ; uniformiser preview) |
| §16–19 UX / a11y / perf / sécu | qualité | **Continu** |
| §20 Tests parité | Vitest + E2E | **Partiel** (tests §7/§11/§12/§14) |
| §21–23 Validations / critères / archive | build/zip | **Non fait** (build complet non relancé ici) |
| Étape 1 Matrices A–E | audit | **Synthèse ci-dessous** |

---

## 1. Architecture de navigation

| # | Domaine | Studio | État |
|---|---------|--------|------|
| 1 | Vue d’ensemble | `cockpit` | OK |
| 2 | Produits & publication | `articles` | OK route |
| 3 | Matières, formats & coûts | `matieres` | 6 sous-vues |
| 4 | Studio Prix & Calculs | `prix` | formules / versions / sim |
| 5 | Options & finitions | `finitions` | chips + finitions |
| 6 | Données & contrôle | `excel` | import + diagnostics + histo |

---

## 2. Matrices d’audit (synthèse Étape 1)

### A. Fonctionnelle (extrait)

| Fonction | Écran | API | Décision |
|----------|-------|-----|----------|
| Produits | `studio=articles` | `/api/backoffice/articles`, dynamic-pricing | Garder fiche unifiée |
| Matières | `studio=matieres` | base-material-prices / base-materials | Grille unifiée + vues |
| Formules | `studio=prix&tab=regles` | `/api/dynamic-pricing/[id]` | VisualPriceBuilder |
| Parité POS | `studio=excel&tab=anomalies` | dynamic-pricing + sync-diagnostics | Centre 3 onglets |
| Compléter catalogue | Matières actions | POST analyze/apply-catalog | Preview obligatoire |

### B. Données (canonique)

| Donnée | Source | Éditeur | Lecteurs |
|--------|--------|---------|----------|
| Produit / profil | `ArticlePricingProfile` | Admin articles | POS projection |
| Formule | `FormulaVersion` | Studio Prix | POS resolvePrice |
| Matière | `BaseMaterial` | Matières | moteurs / stock |
| Stock | `StockItem` + `StockMovement` | ajustement mouvement | production |
| Options | `ProductOptionGroup/Value` + chips | Options | POS configurateur |

### C. Calculs

| Famille | Moteur | Entrées | Arrondi | Tests |
|---------|--------|---------|---------|-------|
| Dynamique publié | resolvePrice + FormulaVersion | qty, options, dims | blocks round_ar | price-builder + simulate |
| Legacy | SalePrice2026 / catalogue | config | moteur legacy | simulate engine flag |

### D. Admin / POS

| Signal | Outil |
|--------|-------|
| Profil+formule publiés | Parité « Synchronisé » |
| Formule draft | « Publication requise » |
| Drift technique | SyncCenterPanel |
| Sync HTTP | pricing/sync-pos ; jamais badge OK si partiel |

### E. UX

| Élément | Décision |
|---------|----------|
| Sidebar Domaines | 6 max ; prix sans 2e sidebar |
| Catalogue POS admin autonome | Fusionné / alias (zéro suppression) |
| Détail sous table | drawer / panneau (articles, formules) |

---

## 3. Chaîne canonique

```text
Admin → validation → version publiée → projection POS
→ configurateur → pricingResolver → panier → devis → commande figée
→ production → stock (mouvements)
```

---

## 4. Changements livrés (cumul)

Nav 6 domaines · matières 6 vues · formules no-code · versions · simulateur DB · parité · sync honnête · options health · cockpit actions · **§8 preview catalogue** · **§7 marge/marque** · **compare draft/publié** · **§12 usage commercial** · **profil matière 10 sections** · **§14 SI/ALORS + anti-cycles** · **§11 hash projection `_coherence`** · tests Vitest.

---

## 5. Phases encore manquantes (priorité)

1. Excel multi-feuilles transactionnel matières  
2. Scénarios de référence pré-publication + CI contractuelle Admin=POS=panier  
3. Publication atomique multi-entités + invalidation cache complète  
4. Build / lint / E2E / archive livrable (§21–23)

Livré récemment : profil matière · usage commercial · dépendances SI/ALORS + cycles · hash projection à la publication.

---

## 6. URLs smoke

- Cockpit : `?studio=cockpit`  
- Matières + compléter : `?studio=matieres` → « Analyser et compléter… »  
- Profil matière : `?studio=matieres&view=usages` (clic ligne → drawer)  
- Formules compare : `?studio=prix&tab=regles`  
- Dépendances SI/ALORS : `?studio=finitions&tab=dependencies`  
- Parité : `?studio=excel&tab=anomalies`  
- Sim : `?studio=prix&tab=simulation`

**Démo :** `DEMO_EMAIL` / `<DEMO_PASSWORD_FROM_ENV>` · local `http://127.0.0.1:3020`
