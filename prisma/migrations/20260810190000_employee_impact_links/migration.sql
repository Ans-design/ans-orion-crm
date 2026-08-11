-- SQLite / Postgres compatible (employee impact links)
-- Note: IF NOT EXISTS on ADD COLUMN is SQLite 3.35+ / Postgres 9.1+

ALTER TABLE "ClientReclamation" ADD COLUMN "employeeId" TEXT;
ALTER TABLE "MaterialWaste" ADD COLUMN "employeeId" TEXT;

CREATE INDEX "ClientReclamation_employeeId_idx" ON "ClientReclamation"("employeeId");
CREATE INDEX "MaterialWaste_employeeId_idx" ON "MaterialWaste"("employeeId");
