# Proposition schéma Prisma — ANS ORION

> **Non appliqué automatiquement.** Validation requise avant migration.

## État actuel

Le schéma existant (~97 modèles) couvre déjà la majorité des besoins. Cette proposition documente les **extensions** pour alignement plan A→Z.

## Extensions recommandées

### ArticleTemplate (nouveau)

```prisma
model ArticleTemplate {
  id              String   @id @default(cuid())
  slug            String   @unique
  label           String
  family          String
  calculationType String   @default("piece")
  saleUnit        String   @default("pièce")
  defaultStatus   String   @default("draft")
  configJson      String?  // variables, options par défaut
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### WorkflowStatus / WorkflowTransition (optionnel — phase 2)

Actuellement en TypeScript (`lib/data/status-registry.ts`, `business-workflow.ts`).  
Migration DB si besoin de configuration runtime backoffice.

### ArticleStockLink (enrichissement)

Lier `ArticlePricingProfile` ↔ `StockItem` avec formule consommation.  
Partiellement via `stockRules` sur profil existant.

## Indexes recommandés (existants ou à ajouter)

- `ArticlePricingProfile.articleId` (unique ✓)
- `ArticlePricingProfile.status`, `.family`
- `AuditLog.createdAt`
- `Commande.statut`, `Client.email`

## Statuts article

`draft` | `published` | `archived` | `review` (à vérifier)

## Stratégie migration

1. **Phase 1** — Templates en `lib/data/article-templates.ts` + API (fait)
2. **Phase 2** — Table `ArticleTemplate` + seed
3. **Phase 3** — Déprécier champs catalogue statique
4. **Phase 4** — `prisma migrate` versionné sur Neon

## MySQL Hostinger

Non requis si Postgres Neon maintenu. Si migration MySQL future : changer `provider = "mysql"` et adapter types JSON/Decimal.
