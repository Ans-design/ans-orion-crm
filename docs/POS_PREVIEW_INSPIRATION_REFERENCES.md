# Références inspiration — aperçus POS

Document de cadrage (aucun asset externe importé sans licence).

## Outils étudiés

- **Mockups 2D/3D** : Yellow Images, Placeit, LS Graphics, Mockup World, Artboard Studio
- **Modèles 3D** : Sketchfab, TurboSquid, CGTrader, Google Model-viewer
- **Rendu Web** : Three.js, Babylon.js, Canvas/SVG, CSS pseudo-3D

## Bonnes pratiques retenues

- Ombre portée au sol, ratio dynamique selon dimensions client
- Zone imprimable distincte, texture client en `object-fit: contain`
- Fallback sobre par famille plutôt que photo générique trompeuse
- 3D lazy uniquement sur produits prioritaires (roll-up, mug, boîte, oriflamme)

## Adapté à ANS ORION

- Registre central `product-preview.registry.ts`
- 9 fallbacks SVG pseudo-3D par famille
- `ProductPreviewStage` proportionnel
- `ScaleReference` pour grands formats
- Badge « Aperçu indicatif » systématique

## Non retenu (lourdeur / licence)

- 95 scènes Three.js actives
- Assets payants Envato / Adobe Stock sans licence projet
- Copie directe de mockups protégés

## Évolution

- GLB légers dans `public/mockups/3d/` pour roll-up / packaging
- Texture mapping UV quand modèles validés
