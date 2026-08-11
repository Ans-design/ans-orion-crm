# Règles Cursor — ANS ORION

Référence pour agents Cursor. Règles détaillées : `.cursor/rules/*.mdc`

## Principes

1. **Zéro suppression** — regrouper, rediriger, masquer ; ne pas retirer de modules
2. **DB = source de vérité** — pas de prix/articles/règles en dur dans React
3. **API → Service → Prisma** — pas de Prisma dans les composants
4. **Backoffice configure** — POS/Devis lisent les mêmes données
5. **Lazy-load** modules lourds (backoffice, talk, graphiques)
6. **Build avant conclusion** — `npm run build`

## Unités imprimerie

- Grand format : **cm**, m²
- Petit format : **mm**
- Matière ≠ grammage (champs séparés)

## UI

- Coins 7px (`--orion-radius`)
- Pas de fond bleu indépendant en mode nuit
- Backoffice et ANS Talk : **pas flottants** en navigation principale

## Sécurité (phase actuelle)

- `requireAuth` / `requirePermission` sur APIs
- Pas de secrets dans le repo
- Durcissement avancé → version finale

## Déploiement

- Hostinger Node.js, pas static export
- Healthcheck après deploy

## Documents

- `docs/ARCHITECTURE.md`
- `docs/FLOW_GLOBAL.md` — flow métier intégré
- `docs/MODULES_MAP.md` — registre modules
- `docs/USER_JOURNEYS.md` — parcours par rôle
- `docs/SYNC_MATRIX.md` — synchronisation inter-modules
- `docs/BACKOFFICE_FLOW.md` — Backoffice source de vérité
- `docs/ROADMAP_EXECUTION.md`
- `docs/ans-orion-roadmap-etapes.txt` (roadmap 40 étapes)

## Règles flow métier (ultraprompt complémentaire)

- `.cursor/rules/global-flow.mdc`
- `.cursor/rules/backoffice-source-of-truth.mdc`
- `.cursor/rules/module-sync.mdc`
- `.cursor/rules/user-journeys.mdc`
- `.cursor/rules/no-delete-business-features.mdc`
- `.cursor/rules/performance-flow.mdc`
