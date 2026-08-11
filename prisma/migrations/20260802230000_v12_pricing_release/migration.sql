-- V12 Lot 2: PricingRelease + PricingActivePointer (additive)

CREATE TABLE IF NOT EXISTS "PricingRelease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "restoredFromVersion" INTEGER,
    "snapshotJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "PricingRelease_version_key" ON "PricingRelease"("version");
CREATE INDEX IF NOT EXISTS "PricingRelease_status_publishedAt_idx" ON "PricingRelease"("status", "publishedAt");

CREATE TABLE IF NOT EXISTS "PricingActivePointer" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "releaseId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PricingActivePointer_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "PricingRelease" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PricingActivePointer_releaseId_key" ON "PricingActivePointer"("releaseId");
