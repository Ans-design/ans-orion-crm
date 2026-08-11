# Import Excel POS — ANS ORION

Placez le fichier fusion ici :

```
data/ANS_ORION_FUSION_METIER_POS_STOCK_PRIX_COMPLET.xlsx
```

Puis exécutez :

```bash
DATABASE_URL="postgresql://..." npm run sync:pos-prices
npm run verify:pos-prices
```

Le script `import-fusion-excel.ts` est aussi appelé automatiquement lors du `seed:production` si le fichier est présent.

**Sans Excel** : `npm run seed:regles` applique les règles catalogue par défaut (fallback).
