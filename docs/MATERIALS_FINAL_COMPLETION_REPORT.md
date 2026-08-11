# Rapport final — complétion matières ANS ORION

## Résultat

- **150 matières/grammages** catalogués (OFFICIAL + SUPPLEMENTARY + impression SF)
- Offset : 70g–160g
- Glossy/Couché brillant : 115g–350g
- Autocopiant/NCR : CB, CFB, CF, 2–4 plis
- Grand format : bâche, vinyle, PVC, acrylique, canvas…
- Fallback catalogue si DB indisponible
- Table Backoffice : filtres, CRUD, duplication, archivage, import stock

## Commandes

```bash
npx prisma db push
npx prisma generate
npm run seed:base-materials
npx tsx scripts/audit-materials-grammages.ts
npm run build
```

## Prochaines étapes

1. Compléter prix base impression sans finition (anomalies)
2. Publier matières validées
3. Lier stock items existants
4. Vérifier POS article par article
