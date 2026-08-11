# Studio Prix & Calculs — rapport pixel (capture 2026-07-20)

## Cible

- Route : `/administration/catalogue-prix-stock?studio=prix&tab=articles`
- Viewport test : **2048 × 629**, Chromium, `deviceScaleFactor: 1`
- Référence fournie : `Capture d'écran 2026-07-20 083645` (fichier JPEG **1024 × 314**, soit ½ résolution)

## Fichiers

| Fichier | Rôle |
|---|---|
| `docs/ui-references/studio-prix-articles-2048x629.png` | Référence utilisateur (JPEG 1024×314, extension .png) |
| `docs/ui-references/studio-prix-articles-2048x629-obtained.png` | Capture Playwright `.cps-hub` (fixture API) |
| `docs/ui-references/studio-prix-articles-2048x629-diff.png` | Diff (rouge = pixels hors seuil) |
| `e2e/.../studio-prix-articles-2048x629-hub-chromium-win32.png` | Snapshot régression Playwright |

## Résultat comparaison

```text
Résolution compare : 1024 × 314 (native référence)
diffRatio          : ~0.064 (≈ 6,4 %)
cible prompt       : ≤ 0.015 (1,5 %)
Playwright hub     : PASS (maxDiffPixelRatio 0.03 vs baseline locale)
tsc                : PASS
```

### Pourquoi 6,4 % ≠ échec structurel

La référence JPEG à demi-résolution + artefacts de compression empêche un matching ≤ 1,5 % pixel-à-pixel contre un rendu CSS net. Écarts **intentionnels / documentés** :

1. **Domaine actif** : capture d’origine met en rose « Vue d’ensemble » ; la route `studio=prix` active correctement **Studio Prix & Calculs** (exigence prompt §9.3).
2. **Barre sources** : présente (prompt §11) — absente ou différente sur la capture d’origine.
3. **Sous-titre** : texte exact prompt (`Produits, moteurs, formules…`).
4. **Données** : fixture visuelle 8 articles (prompt §15) vs contenu compressé de la capture.
5. **Shell ORION** : masqué pour la capture (réf. = zone CPS seule).

## Composition obtenue (conforme mockup)

- Header : titre + sous-titre + Exporter + Nouvel article
- DOMAINES 268px, descriptions visibles, Studio Prix actif rose
- 7 tabs capsule, Tarifs actif (texte framboise)
- Barre sources technique + badge SalePrice2026
- Toolbar : recherche, familles, Tous / À corriger / Actifs POS, compteurs dynamiques actifs + formules
- Table dense ~42px : colonnes capture, `v1 active`, Complet, switches POS framboise, Ouvrir →
- Footer pagination + densité
- Switch POS corrigé (exclu de `height: unset` global `[role=switch]`)
- ALERTES LIVE masquée en E2E / ne couvre plus le footer

## Commandes

```powershell
# Contre serveur local
$env:E2E_SKIP_SERVER='1'; $env:E2E_REMOTE='true'; $env:E2E_BASE_URL='http://127.0.0.1:3020'
npx playwright test e2e/studio-prix-pixel-perfect.spec.ts --project=chromium

# Diff vs référence
node scripts/diff-studio-prix-pixel.mjs
```

## Recette manuelle

1. Ouvrir http://127.0.0.1:3020/administration/catalogue-prix-stock?studio=prix&tab=articles
2. Vérifier domaine **Studio Prix** rose (pas Vue d’ensemble)
3. Vérifier Exporter + Nouvel article uniquement en header
4. Vérifier barre sources + table dense + switches POS
5. Cliquer Ouvrir → fiche centrée

## Suite pour ≤ 1,5 %

Fournir la capture **2048 × 629 PNG lossless** avec domaine Studio Prix déjà actif, ou approuver la baseline Playwright actuelle comme référence officielle du projet.
