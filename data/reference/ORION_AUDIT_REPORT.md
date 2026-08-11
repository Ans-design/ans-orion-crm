# Audit ORION — 2026-06-28

## Résumé

| Métrique | Valeur |
|----------|--------|
| Fichiers TS/TSX | 943 |
| Routes API | 184 |
| Pages app | 82 |
| Composants UI | 61 |
| Fichiers > 400 lignes | 26 |
| APIs protégées | 183/184 |
| APIs avec auth | 141/184 |
| APIs avec timeout | 9/184 |
| Routes HTML mappées | 0 |

## Fichiers volumineux (top 10)

- `lib/data/config-types.ts` — 4292 lignes
- `app/(app)/pos/[id]/page.tsx` — 1764 lignes
- `app/(app)/clients/page.tsx` — 1585 lignes
- `components/article-mockups.tsx` — 1072 lignes
- `lib/messaging/messaging-service.ts` — 901 lignes
- `components/ans-talk/ans-talk-app.tsx` — 830 lignes
- `app/login/page.tsx` — 692 lignes
- `app/(app)/devis/page.tsx` — 670 lignes
- `app/(app)/dashboard/page.tsx` — 644 lignes
- `components/admin/fusion-admin-panels.tsx` — 632 lignes

## Design system

- tokens CSS : ✓
- tokens TS : ✓
- app-ui barrel : ✓
- formatters : ✓

## Recommandations

- Découper 26 fichier(s) > 400 lignes
- Protéger 1 route(s) API (try/catch ou runApiHandler)
- POS : ne pas refactoriser — sync prix via Excel
- Design : utiliser AppPageHeader + orion-card sur toutes les pages
