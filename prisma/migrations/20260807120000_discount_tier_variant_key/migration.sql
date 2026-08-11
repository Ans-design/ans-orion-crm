-- DiscountTier: paliers par variante (format / matière / support)
-- Alter unique (articleId, minQty) → (articleId, variantKey, minQty)

PRAGMA foreign_keys=OFF;

CREATE TABLE "DiscountTier_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "variantLabel" TEXT,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER,
    "unitPrice" INTEGER,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT DEFAULT 'config-types-seed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscountTier_new_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ArticlePricingProfile" ("articleId") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "DiscountTier_new" (
  "id", "articleId", "variantKey", "variantLabel", "minQty", "maxQty",
  "unitPrice", "discountPercent", "active", "source", "createdAt", "updatedAt"
)
SELECT
  "id", "articleId", '', NULL, "minQty", "maxQty",
  "unitPrice", "discountPercent", "active", "source", "createdAt", "updatedAt"
FROM "DiscountTier";

DROP TABLE "DiscountTier";
ALTER TABLE "DiscountTier_new" RENAME TO "DiscountTier";

CREATE UNIQUE INDEX "DiscountTier_articleId_variantKey_minQty_key" ON "DiscountTier"("articleId", "variantKey", "minQty");
CREATE INDEX "DiscountTier_articleId_idx" ON "DiscountTier"("articleId");
CREATE INDEX "DiscountTier_articleId_variantKey_idx" ON "DiscountTier"("articleId", "variantKey");

PRAGMA foreign_keys=ON;
