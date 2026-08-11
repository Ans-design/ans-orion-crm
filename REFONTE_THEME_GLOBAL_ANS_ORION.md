# REFONTE THEME GLOBAL — ANS ORION

Date : 2026-07-11  
Périmètre : UI / UX / Design System / Layout — **aucune logique métier cassée**

## Ancien problème

- Identité visuelle fragmentée (clair / sombre / admin / CPS)
- Accents bleus/violets résiduels (Catalogue light, charts, analytics)
- Conteneurs `max-w-[1600px]` centrés → vides latéraux
- Contraste texte parfois faible en dark
- Catalogue Prix & Stock en « blue SaaS » hors marque ANS

## Choix de palette

| Rôle | Couleur |
|------|---------|
| Primary | Rouge premium `#E7194F` |
| Hover / vivid | `#F72565` / `#C91443` |
| Secondary | Or / ambre `#FFB21A` / `#FF8A00` |
| Fond dark | Bleu nuit `#07111F` → panels `#0E1A2D` / `#121E31` |
| Texte | Quasi-blanc `#F8F4EE` · muted `#C8D0E0` |
| Success / Warning / Danger | Vert / Or / Rouge clair |
| Charts | Rouge · Or · Vert · Orange · Gris (**plus de violet**) |

## Fichiers refondus

| Fichier | Action |
|---------|--------|
| `styles/design-tokens.css` | Dark renforcé, charts sans violet |
| `styles/theme-global-refonte.css` | **Nouveau** — largeur, tables, CTA, focus, sidebar |
| `app/globals.css` | Import refonte |
| `app/(app)/_components/app-shell.tsx` | Padding contenu densifié |
| `components/admin/catalogue-prix-stock/catalogue-prix-stock-light.css` | Brand rouge ANS (était bleu) |
| `components/backoffice-v2/admin-backoffice.css` | Primary rouge, indicative or |
| `lib/services/performance-analytics-service.ts` | Couleurs graphiques rouge/or |
| `styles/design-system.css` | Commentaire radius 7px |

## Règles largeur / layout

- `main.orion-viewport` : `max-width: none`, paddings `clamp` réduits
- `.ab2-shell` : force `max-width: none` (annule `max-w-[1600px]` / `1200px`)
- Grilles KPI / dashboard : pleine largeur

## Modules impactés (visuel)

1. Shell global (sidebar active rouge, topbar contraste)
2. Administration / Backoffice v2
3. Catalogue, Prix & Stock (CPS light → rouge/or)
4. Dashboards / charts / analytics
5. Tables (headers uppercase, hover row)

## Préservé (non touché)

- Prisma, API, formules, sync POS, Excel, pricing engines
- Structure routes / permissions
- Données métier

## Checklist validation

- [x] Rouge / or / ambre comme identité dominante
- [x] Violet chart / CPS blue retirés
- [x] Largeur contenu étendue
- [x] Contraste dark amélioré (texte muted)
- [x] CTA primary unifiés
- [x] Radius 7px conservé
- [ ] Revue visuelle manuelle multi-pages (recommandée)
- [ ] Smoke POS + Admin après hard refresh navigateur

## Risques

- Pages avec layouts très spécifiques peuvent nécessiter un micro-ajustement CSS local
- Cache navigateur : faire un hard refresh (Ctrl+F5) pour voir les tokens

## Suite recommandée (P2)

- Migrer les `max-w-6xl` restants (CM, finance) vers wide
- Aligner POS cards sur tokens `--primary` / `--ans-gold-*`
- Audit contraste WCAG automatisé
