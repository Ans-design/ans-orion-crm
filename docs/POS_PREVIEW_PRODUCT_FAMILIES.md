# Familles visuelles — aperçus POS (95 produits)

Classification utilisée par `lib/pos-preview/product-preview.families.ts` et `product-preview.registry.ts`.

## 1. Papier petit format (`papier-petit-format`)

Cartes, flyers, affiches événement, tirages photo, documents, impression.

**Fallback** : `PaperFallback`  
**Produits** : `cv-*`, `fly-std`, `evt-affiche`, `evt-billet`, `evt-carte-voeux`, `evt-cheque`, `evt-enveloppe`, `doc-carnet`, `imp-impression`, `ph-tirage`, `cal-marquepage`, `evt-badge`

## 2. Livrets / publications (`livrets-publications`)

Livrets, agendas, calendriers, photobooks.

**Fallback** : `BookletFallback`  
**Produits** : `bk-livres`, `ph-photobook`, `bn-bloc-note`, `cal-plateau`, `cal-mural`, `plv-porte-flyers`

## 3. Reliure / façonnage (`reliure-faconnage`)

Finitions atelier (pelliculage, reliure, découpe…).

**Fallback** : `BindingFallback`  
**Produits** : `fin-*` (toute la catégorie finitions)

## 4. Grand format souple (`grand-format-souple`)

Vinyles, bâches, tissu, films adhésifs souples.

**Fallback** : `FlexibleLargeFormatFallback`  
**Produits** : `gf-vinyl-*`, `gf-bache`, `gf-dosbleu`, `gf-tissu`, `gf-oneway`, `gf-reflechissant`, `gf-frosted`, `gf-photo`

## 5. Grand format rigide (`grand-format-rigide`)

Panneaux, forex, plexi, acrylique, canvas.

**Fallback** : `RigidPanelFallback`  
**Produits** : `gf-pvc`, `gf-plexi`, `gf-acrylic`, `gf-pp`, `gf-toile`, `ph-cadre`

## 6. Support vertical / événementiel (`support-vertical-evenementiel`)

Roll-up, X-banner, oriflamme, chevalets PLV, totems.

**Fallback** : `VerticalDisplayFallback`  
**Produits** : `plv-rollup`, `plv-xbanner`, `plv-oriflamme`, `plv-presentoir-sol`, `plv-*`, `cal-chevalet*`, `evt-fanion`, `evt-photocall`, `evt-comptoir`

## 7. Textile (`textile`)

Vêtements et sacs textile.

**Fallback** : `TextileFallback`  
**Produits** : `tx-*`

## 8. Objet personnalisé (`objet-personnalise`)

Goodies, packaging, objets promo.

**Fallback** : `ObjectFallback` (+ `mockupKey` : mug, bottle, pen, box…)  
**Produits** : `gd-*`, `pkg-*`, `evt-pochette`, `evt-bracelet`, `evt-cordon`

## 9. Services graphiques (`services-graphiques`)

Conception, maquette, BAT.

**Fallback** : `GraphicServiceFallback`  
**Produits** : `cg-hub`

## Règle inter-familles

Un produit **ne peut pas** utiliser le mockup d’une autre famille. Validation : `npm run validate:pos-previews`.
