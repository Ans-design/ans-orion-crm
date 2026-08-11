-- V12 Lot 4: unicité dossier GPAO / brief studio par commande

CREATE UNIQUE INDEX IF NOT EXISTS "ProductionDossier_commandeId_key" ON "ProductionDossier"("commandeId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudioBrief_commandeId_key" ON "StudioBrief"("commandeId");
