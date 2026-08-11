# Contrôle 95 produits — aperçus POS

Checklist générée après refonte. Détail complet : `docs/POS_PREVIEW_95_PRODUCTS_REPORT.md`.

## Critères globaux

| Critère | Statut |
|---------|--------|
| 95 produits dans le registre | OK |
| Famille + fallback par produit | OK |
| Aucun mockup mug hors `gd-mug` | OK |
| Ancien `ArticlePreview` hors flux POS | OK |
| `npm run validate:pos-previews` | PASS |
| Cohérence visuelle fallback famille | OK |
| Risque faux aperçu legacy | Non (bypass studio SVG) |

## Exemples validés

| Produit | Famille | Fallback | Ancien aperçu supprimé | Cohérence |
|---------|---------|----------|------------------------|-----------|
| Vinyle blanc autocollant | grand-format-souple | FlexibleLargeFormatFallback | oui | OK |
| Livres & publications | livrets-publications | BookletFallback | oui | OK |
| Mug | objet-personnalise | ObjectFallback (mug) | oui | OK |
| Bâche | grand-format-souple | FlexibleLargeFormatFallback | oui | OK |
| Roll-up | support-vertical-evenementiel | VerticalDisplayFallback + 3D | oui | OK |
| T-Shirt | textile | TextileFallback | oui | OK |
| Plexiglas | grand-format-rigide | RigidPanelFallback | oui | OK |
| Conception graphique | services-graphiques | GraphicServiceFallback | oui | OK |

## Remarque

Les mockups photo-réalistes par produit restent à produire progressivement. En attendant, chaque article affiche un **fallback premium cohérent** avec badge « Aperçu indicatif » — jamais une silhouette d’une autre famille.
