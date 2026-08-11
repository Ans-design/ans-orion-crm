-- Matières unifiées : prix vierge dédié + auteur corbeille
ALTER TABLE "BaseMaterial" ADD COLUMN IF NOT EXISTS "blankSellPrice" DOUBLE PRECISION;
ALTER TABLE "BaseMaterial" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;

-- Migrate : maxPrice → blankSellPrice si vierge vide
UPDATE "BaseMaterial"
SET "blankSellPrice" = "maxPrice"
WHERE "blankSellPrice" IS NULL AND "maxPrice" IS NOT NULL AND "maxPrice" > 0;

-- Publication → Actif / Inactif (sans perte)
-- Publiés ou brouillons complets (prix) → actifs
UPDATE "BaseMaterial"
SET "active" = true,
    "publicationStatus" = 'published'
WHERE "archived" = false
  AND (
    "publicationStatus" = 'published'
    OR (
      "publicationStatus" = 'draft'
      AND (
        ("blankSellPrice" IS NOT NULL AND "blankSellPrice" > 0)
        OR ("basePrintPrice" IS NOT NULL AND "basePrintPrice" > 0)
        OR ("maxPrice" IS NOT NULL AND "maxPrice" > 0)
      )
    )
  );

-- Brouillons incomplets → inactifs + alerte
UPDATE "BaseMaterial"
SET "active" = false,
    "anomalyNotes" = CASE
      WHEN "anomalyNotes" IS NULL OR "anomalyNotes" = '' THEN 'À compléter'
      WHEN "anomalyNotes" NOT LIKE '%À compléter%' THEN "anomalyNotes" || ' · À compléter'
      ELSE "anomalyNotes"
    END,
    "publicationStatus" = 'published'
WHERE "archived" = false
  AND "publicationStatus" = 'draft'
  AND ("blankSellPrice" IS NULL OR "blankSellPrice" <= 0)
  AND ("basePrintPrice" IS NULL OR "basePrintPrice" <= 0)
  AND ("maxPrice" IS NULL OR "maxPrice" <= 0);
