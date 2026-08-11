# Dépendances candidates mortes (Lot 8) — ANS ORION

Date : 2026-07-30 (purge intégrée)  
Inventaire initial + **purge npm** des packages listés (sauf peers utiles).

## Purgés (désinstallés)

formik, jotai, yup, dayjs, swr, zustand, plotly.js, react-plotly.js, maplibre-gl, gray-matter, react-use, react-datepicker, react-select, react-intersection-observer, @tanstack/react-virtual, tailwind-scrollbar-hide (+ @types associés).

## À conserver (usages confirmés)

- `@sparticuz/chromium`, `puppeteer-core` — PDF
- `csv`, `cookie`, `xlsx`, `zod`, `framer-motion`, `recharts`

## Vérifs post-purge

- `npm run typecheck` / `lint` / `test:e2e:smoke` OK après intégration.
