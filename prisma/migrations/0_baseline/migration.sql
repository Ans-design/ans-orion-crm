-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tel" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "type" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "canalVente" TEXT,
    "canalDecouverte" TEXT,
    "canalCommande" TEXT,
    "ca" TEXT,
    "cmds" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "nif" TEXT,
    "statNumber" TEXT,
    "commercialName" TEXT,
    "commercialId" TEXT,
    "categorie" TEXT NOT NULL DEFAULT 'Client',
    "relanceAt" TIMESTAMP(3),
    "notes" TEXT,
    "charte" TEXT,
    "tags" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReclamation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Ouverte',
    "priorite" TEXT NOT NULL DEFAULT 'Normale',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientReclamation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'impression',
    "status" TEXT NOT NULL DEFAULT 'ok',
    "utilization" INTEGER NOT NULL DEFAULT 0,
    "nextMaintenance" TIMESTAMP(3),
    "notes" TEXT,
    "site" TEXT NOT NULL DEFAULT 'AX0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientId" TEXT,
    "items" JSONB,
    "sousTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "notes" TEXT,
    "validUntil" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevisLigne" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "articleLabel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "configSnapshot" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unite" TEXT NOT NULL DEFAULT 'ex.',
    "prixUnitaireAuto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prixUnitaireForce" DOUBLE PRECISION,
    "totalForce" DOUBLE PRECISION,
    "totalLigne" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricingMode" TEXT NOT NULL DEFAULT 'auto',
    "priceReason" TEXT,
    "remarks" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevisLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commande" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientId" TEXT,
    "devisId" TEXT,
    "article" TEXT NOT NULL,
    "configSnapshot" JSONB,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acompte" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'À planifier',
    "avancement" INTEGER NOT NULL DEFAULT 0,
    "operateur" TEXT,
    "dateCmd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLiv" TIMESTAMP(3),
    "priorite" TEXT NOT NULL DEFAULT 'Normal',
    "machine" TEXT,
    "note" TEXT,
    "site" TEXT NOT NULL DEFAULT 'AX0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeBlocage" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "raison" TEXT NOT NULL,
    "causeDetail" TEXT,
    "responsable" TEXT,
    "actionAttendue" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolveNote" TEXT,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandeBlocage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeLigne" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "articleId" TEXT,
    "articleLabel" TEXT NOT NULL,
    "configSnapshot" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalLigne" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommandeLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Production" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "priorite" TEXT NOT NULL DEFAULT 'Normal',
    "operateur" TEXT,
    "machine" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "avancement" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "proofPhotoUrl" TEXT,
    "proofNote" TEXT,
    "proofAt" TIMESTAMP(3),
    "proofBy" TEXT,
    "site" TEXT NOT NULL DEFAULT 'AX0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionEtape" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'À faire',
    "operateur" TEXT,
    "machine" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "dureeMin" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionEtape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "commandeId" TEXT,
    "clientId" TEXT,
    "lignes" JSONB,
    "sousTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "dateEmission" TIMESTAMP(3),
    "dateEcheance" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "factureId" TEXT,
    "commandeId" TEXT,
    "clientId" TEXT,
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'Espèces',
    "reference" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Acompte',
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Livraison" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "clientId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Préparation',
    "adresseLiv" TEXT,
    "contactLiv" TEXT,
    "telLiv" TEXT,
    "livreur" TEXT,
    "datePrevue" TIMESTAMP(3),
    "dateLivree" TIMESTAMP(3),
    "colisCount" INTEGER NOT NULL DEFAULT 1,
    "poidsKg" DOUBLE PRECISION,
    "notes" TEXT,
    "proofPhotoUrl" TEXT,
    "proofNote" TEXT,
    "proofAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openingFloat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingCash" DOUBLE PRECISION,
    "expectedCash" DOUBLE PRECISION,
    "variance" DOUBLE PRECISION,
    "totalsJson" TEXT,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarif" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "articleLabel" TEXT NOT NULL,
    "palier" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prixBase" DOUBLE PRECISION,
    "devise" TEXT NOT NULL DEFAULT 'Ar',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "modifiePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessRule" (
    "id" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "articleId" TEXT,
    "ruleKey" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "message" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceFormula" (
    "id" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "formulaKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "examples" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTemplate" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL DEFAULT 'piece',
    "saleUnit" TEXT NOT NULL DEFAULT 'pièce',
    "description" TEXT NOT NULL DEFAULT '',
    "defaultVariables" TEXT NOT NULL DEFAULT '[]',
    "exampleArticleIds" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTransitionRule" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "fromStatut" TEXT NOT NULL,
    "toStatut" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "actionKey" TEXT,
    "module" TEXT,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTransitionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticlePricingProfile" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "articleLabel" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL DEFAULT 'piece',
    "saleUnit" TEXT NOT NULL DEFAULT 'pièce',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "prixBase" DOUBLE PRECISION,
    "prixM2" DOUBLE PRECISION,
    "prixCm2" DOUBLE PRECISION,
    "qtyMin" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT DEFAULT 'config-types-seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticlePricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionGroup" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "sectionIcon" TEXT,
    "fieldType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visiblePos" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "impactsPrice" BOOLEAN NOT NULL DEFAULT false,
    "impactsStock" BOOLEAN NOT NULL DEFAULT false,
    "impactsProduction" BOOLEAN NOT NULL DEFAULT true,
    "isInformational" BOOLEAN NOT NULL DEFAULT false,
    "requiresAdminValidation" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "source" TEXT DEFAULT 'config-types-seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionValue" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "valueKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceModifier" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "modifierType" TEXT NOT NULL DEFAULT 'fixed',
    "forcePrice" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountTier" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER,
    "unitPrice" DOUBLE PRECISION,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT DEFAULT 'config-types-seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UrgencyRule" (
    "id" TEXT NOT NULL,
    "articleId" TEXT,
    "label" TEXT NOT NULL,
    "surchargePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresValidation" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT DEFAULT 'config-types-seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UrgencyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPrice" (
    "id" TEXT NOT NULL,
    "articleId" TEXT,
    "materialKey" TEXT,
    "grammage" TEXT,
    "prixM2" DOUBLE PRECISION,
    "prixCm2" DOUBLE PRECISION,
    "scope" TEXT NOT NULL DEFAULT 'article',
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT DEFAULT 'config-types-seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingVariable" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "valueType" TEXT NOT NULL DEFAULT 'number',
    "scope" TEXT NOT NULL DEFAULT 'global',
    "articleId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT DEFAULT 'config-types-seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaVersion" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "label" TEXT,
    "expression" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "pipeline" JSONB,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "source" TEXT DEFAULT 'config-types-seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormulaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockRule" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "optionFieldKey" TEXT,
    "ruleType" TEXT NOT NULL DEFAULT 'consumption',
    "condition" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT DEFAULT 'config-types-seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleVersion" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB NOT NULL,
    "reason" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "label" TEXT,
    "snapshot" JSONB NOT NULL,
    "changeSummary" JSONB,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceCounter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SequenceCounter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Papier',
    "paperType" TEXT,
    "grammage" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'feuille',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minQty" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "unitCost" DOUBLE PRECISION,
    "supplier" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "materialKey" TEXT,
    "stockKind" TEXT,
    "lengthM" DOUBLE PRECISION,
    "widthM" DOUBLE PRECISION,
    "yieldM2" DOUBLE PRECISION,
    "yieldUnit" TEXT,
    "pricingMode" TEXT NOT NULL DEFAULT 'auto',
    "site" TEXT NOT NULL DEFAULT 'AX0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "commandeId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "commandeId" TEXT,
    "studioBriefId" TEXT,
    "metierTaskId" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'autre',
    "versionLabel" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Reçu',
    "proofId" TEXT,
    "storageKey" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "previewKey" TEXT,
    "previewStatus" TEXT NOT NULL DEFAULT 'none',
    "previewMimeType" TEXT,
    "previewContent" TEXT NOT NULL DEFAULT '',
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proof" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "commandeId" TEXT,
    "clientId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "commentaireClient" TEXT,
    "commentaireInterne" TEXT,
    "fileAssetId" TEXT,
    "notes" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tel" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "contact" TEXT,
    "categorie" TEXT NOT NULL DEFAULT 'Papier',
    "notes" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "expectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "stockItemId" TEXT,
    "label" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionSlot" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productionId" TEXT,
    "commandeId" TEXT,
    "machine" TEXT,
    "operateur" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Planifié',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "type" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCatalog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "family" TEXT NOT NULL DEFAULT 'Petit format',
    "unit" TEXT NOT NULL DEFAULT 'g/m²',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammageCatalog" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrammageCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPrice" (
    "id" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "articleRaw" TEXT,
    "articleNormalized" TEXT NOT NULL,
    "specification" TEXT,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'Ar',
    "yieldLinked" DOUBLE PRECISION,
    "yieldUnit" TEXT,
    "pricePerYield" DOUBLE PRECISION,
    "unitPurchase" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "moq" DOUBLE PRECISION,
    "leadTimeDays" INTEGER,
    "observation" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "stockItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePrice2026" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "familyPos" TEXT,
    "productNormalized" TEXT NOT NULL,
    "section" TEXT,
    "format" TEXT,
    "dimensions" TEXT,
    "material" TEXT,
    "grammage" TEXT,
    "technology" TEXT,
    "face" TEXT,
    "qtyTier" TEXT,
    "sourcePriceAr" DOUBLE PRECISION,
    "salePriceAr" DOUBLE PRECISION,
    "adminModified" BOOLEAN NOT NULL DEFAULT false,
    "modifiedBy" TEXT,
    "editComment" TEXT,
    "priceType" TEXT NOT NULL DEFAULT 'auto',
    "comment" TEXT,
    "posStatus" TEXT NOT NULL DEFAULT 'active',
    "articleId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalePrice2026_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "commandeId" TEXT,
    "devisId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportAnomaly" (
    "id" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "ref" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "decision" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMessage" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMessageReply" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMessageReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSuggestion" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'En étude',
    "votes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetierTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'production',
    "status" TEXT NOT NULL DEFAULT 'À faire',
    "priorite" TEXT NOT NULL DEFAULT 'Normal',
    "commandeId" TEXT,
    "productionId" TEXT,
    "assigneeId" TEXT,
    "assigneeName" TEXT,
    "assigneeRole" TEXT,
    "talkMessageId" TEXT,
    "conversationId" TEXT,
    "fileAssetId" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "estimatedMin" INTEGER,
    "elapsedSec" INTEGER NOT NULL DEFAULT 0,
    "timerStartedAt" TIMESTAMP(3),
    "timerStatus" TEXT NOT NULL DEFAULT 'idle',
    "problemNote" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "checklist" JSONB,
    "comments" JSONB,
    "evaluation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetierTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "matricule" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "departement" TEXT NOT NULL DEFAULT 'Production',
    "authRole" TEXT NOT NULL DEFAULT 'production',
    "email" TEXT,
    "tel" TEXT,
    "site" TEXT NOT NULL DEFAULT 'AX0',
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "presenceStatut" TEXT NOT NULL DEFAULT 'Absent',
    "horaireDebut" TEXT,
    "horaireFin" TEXT,
    "dateEmbauche" TIMESTAMP(3),
    "notes" TEXT,
    "avatarColor" TEXT,
    "bio" TEXT,
    "station" TEXT,
    "cantineHeure" TEXT DEFAULT '12:00',
    "salaireBaseMGA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notesFraisMGA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heuresSup" INTEGER NOT NULL DEFAULT 0,
    "primeMGA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "congeSolde" DOUBLE PRECISION NOT NULL DEFAULT 12.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePresence" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'Présent',
    "retardMin" INTEGER NOT NULL DEFAULT 0,
    "cause" TEXT,
    "remarque" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAbsence" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Congé payé',
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "motif" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RhAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "authorName" TEXT NOT NULL,
    "authorId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RhAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCharge" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Exploitation',
    "amount" DOUBLE PRECISION NOT NULL,
    "dateCharge" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplierRef" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalObligation" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'autre',
    "label" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'a_preparer',
    "notes" TEXT,
    "documentKey" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockDirectSale" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clientId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'Espèces',
    "notes" TEXT,
    "soldByName" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockDirectSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDossier" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "productionId" TEXT,
    "statutGlobal" TEXT NOT NULL DEFAULT 'Nouveau',
    "priorite" TEXT NOT NULL DEFAULT 'Normal',
    "avancement" INTEGER NOT NULL DEFAULT 0,
    "tempsEstimeMin" INTEGER NOT NULL DEFAULT 480,
    "tempsReelMin" INTEGER NOT NULL DEFAULT 0,
    "delai" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDossierEtape" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'À faire',
    "responsable" TEXT,
    "machine" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "dureeMin" INTEGER,
    "commentaire" TEXT,
    "bloque" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionDossierEtape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionIncident" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'Moyenne',
    "statut" TEXT NOT NULL DEFAULT 'Ouvert',
    "description" TEXT,
    "reportedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioBrief" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT,
    "clientId" TEXT,
    "titre" TEXT NOT NULL,
    "briefText" TEXT,
    "exigences" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Nouveau',
    "assignedTo" TEXT,
    "assignedToName" TEXT,
    "fichiersManquants" BOOLEAN NOT NULL DEFAULT false,
    "tempsPasseMin" INTEGER NOT NULL DEFAULT 0,
    "notesInternes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioCreativeVersion" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'V1',
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "commentaire" TEXT,
    "fileAssetId" TEXT,
    "sentAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioCreativeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioPrepressCheck" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedBy" TEXT,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "StudioPrepressCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'Multi',
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "objectif" TEXT,
    "budget" DOUBLE PRECISION,
    "clientId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmCampaignPost" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'Facebook',
    "statut" TEXT NOT NULL DEFAULT 'Idée',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmCampaignPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmMessageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'Email',
    "category" TEXT NOT NULL DEFAULT 'Commercial',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmMessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmRelance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Commercial',
    "canal" TEXT NOT NULL DEFAULT 'Email',
    "objet" TEXT NOT NULL,
    "message" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Planifiée',
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "templateId" TEXT,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmRelance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleModulePermission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "flags" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleModulePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModuleOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "flags" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModuleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAnnexe" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adresse" TEXT,
    "ville" TEXT,
    "tel" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAnnexe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialWaste" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT,
    "matiere" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unite" TEXT NOT NULL DEFAULT 'feuille',
    "cause" TEXT NOT NULL,
    "poste" TEXT NOT NULL DEFAULT 'production',
    "notes" TEXT,
    "declaredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialWaste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeEvaluation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "ponctualite" INTEGER NOT NULL DEFAULT 0,
    "qualite" INTEGER NOT NULL DEFAULT 0,
    "consignes" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL DEFAULT 'current',
    "notes" TEXT,
    "evaluatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TickerMessage" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TickerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNotificationLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "commandeId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'manual',
    "canal" TEXT NOT NULL DEFAULT 'WhatsApp',
    "message" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Envoyé',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" TEXT,

    CONSTRAINT "ClientNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitCandidate" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "posteVise" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Présélection',
    "progression" INTEGER NOT NULL DEFAULT 10,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skills" TEXT,
    "avatarUrl" TEXT,
    "notes" TEXT,
    "interviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "brutAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lines" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAdvance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "motif" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "dateAvance" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rembourseAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofVersion" (
    "id" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "fileAssetId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'ordinateur',
    "type" TEXT,
    "marque" TEXT,
    "modele" TEXT,
    "serialNumber" TEXT,
    "etat" TEXT NOT NULL DEFAULT 'disponible',
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "localisation" TEXT,
    "site" TEXT NOT NULL DEFAULT 'AX0',
    "poste" TEXT,
    "employeeId" TEXT,
    "prixAchat" DOUBLE PRECISION,
    "dateAchat" TIMESTAMP(3),
    "fournisseur" TEXT,
    "garantieFin" TIMESTAMP(3),
    "derniereMaint" TIMESTAMP(3),
    "prochaineMaint" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'panne',
    "priorite" TEXT NOT NULL DEFAULT 'Normale',
    "statut" TEXT NOT NULL DEFAULT 'Ouvert',
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "machineId" TEXT,
    "equipmentId" TEXT,
    "assigneeId" TEXT,
    "reportedBy" TEXT,
    "diagnostic" TEXT,
    "costMGA" DOUBLE PRECISION,
    "impactPlanning" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkConversation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "serviceKey" TEXT,
    "commandeId" TEXT,
    "devisId" TEXT,
    "productionDossierId" TEXT,
    "description" TEXT,
    "label" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "noResponse" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalkConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "lastReadAt" TIMESTAMP(3),
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkConversationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT,
    "body" TEXT NOT NULL,
    "replyToId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "commandeId" TEXT,
    "proofId" TEXT,
    "metierTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalkMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkMessageRead" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TalkMessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkMessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkAttachment" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "commandeId" TEXT,
    "fileAssetId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT,
    "previewKey" TEXT,
    "checksumSha256" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'V1',
    "status" TEXT NOT NULL DEFAULT 'reçu',
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalkAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkAttachmentVersion" (
    "id" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkAttachmentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkAttachmentDownload" (
    "id" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkAttachmentDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkMessageTask" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "taskId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'À faire',
    "assignedTo" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkMessageTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualiteControle" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'En attente contrôle',
    "checklist" JSONB NOT NULL,
    "commentaire" TEXT,
    "responsable" TEXT,
    "cause" TEXT,
    "actionCorrective" TEXT,
    "cout" DOUBLE PRECISION,
    "proofPhotoUrl" TEXT,
    "controlePar" TEXT,
    "controleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualiteControle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "matricule" TEXT,
    "roleDemande" TEXT,
    "service" TEXT,
    "message" TEXT,
    "attachmentName" TEXT,
    "attachmentContent" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'envoye',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Client_code_key" ON "Client"("code");

-- CreateIndex
CREATE INDEX "Client_statut_idx" ON "Client"("statut");

-- CreateIndex
CREATE INDEX "Client_archived_idx" ON "Client"("archived");

-- CreateIndex
CREATE INDEX "ClientReclamation_clientId_idx" ON "ClientReclamation"("clientId");

-- CreateIndex
CREATE INDEX "ClientReclamation_statut_idx" ON "ClientReclamation"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_code_key" ON "Machine"("code");

-- CreateIndex
CREATE INDEX "Machine_status_idx" ON "Machine"("status");

-- CreateIndex
CREATE INDEX "Machine_category_idx" ON "Machine"("category");

-- CreateIndex
CREATE INDEX "Machine_site_idx" ON "Machine"("site");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_numero_key" ON "Devis"("numero");

-- CreateIndex
CREATE INDEX "Devis_statut_idx" ON "Devis"("statut");

-- CreateIndex
CREATE INDEX "Devis_clientId_idx" ON "Devis"("clientId");

-- CreateIndex
CREATE INDEX "DevisLigne_devisId_idx" ON "DevisLigne"("devisId");

-- CreateIndex
CREATE UNIQUE INDEX "Commande_numero_key" ON "Commande"("numero");

-- CreateIndex
CREATE INDEX "Commande_statut_idx" ON "Commande"("statut");

-- CreateIndex
CREATE INDEX "Commande_clientId_idx" ON "Commande"("clientId");

-- CreateIndex
CREATE INDEX "Commande_devisId_idx" ON "Commande"("devisId");

-- CreateIndex
CREATE INDEX "Commande_site_idx" ON "Commande"("site");

-- CreateIndex
CREATE INDEX "CommandeBlocage_commandeId_idx" ON "CommandeBlocage"("commandeId");

-- CreateIndex
CREATE INDEX "CommandeBlocage_statut_idx" ON "CommandeBlocage"("statut");

-- CreateIndex
CREATE INDEX "CommandeLigne_commandeId_idx" ON "CommandeLigne"("commandeId");

-- CreateIndex
CREATE INDEX "Production_commandeId_idx" ON "Production"("commandeId");

-- CreateIndex
CREATE INDEX "Production_statut_idx" ON "Production"("statut");

-- CreateIndex
CREATE INDEX "Production_site_idx" ON "Production"("site");

-- CreateIndex
CREATE INDEX "ProductionEtape_productionId_idx" ON "ProductionEtape"("productionId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");

-- CreateIndex
CREATE INDEX "Facture_statut_idx" ON "Facture"("statut");

-- CreateIndex
CREATE INDEX "Facture_clientId_idx" ON "Facture"("clientId");

-- CreateIndex
CREATE INDEX "Facture_commandeId_idx" ON "Facture"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_numero_key" ON "Paiement"("numero");

-- CreateIndex
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");

-- CreateIndex
CREATE INDEX "Paiement_commandeId_idx" ON "Paiement"("commandeId");

-- CreateIndex
CREATE INDEX "Paiement_clientId_idx" ON "Paiement"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Livraison_numero_key" ON "Livraison"("numero");

-- CreateIndex
CREATE INDEX "Livraison_commandeId_idx" ON "Livraison"("commandeId");

-- CreateIndex
CREATE INDEX "Livraison_clientId_idx" ON "Livraison"("clientId");

-- CreateIndex
CREATE INDEX "Livraison_statut_idx" ON "Livraison"("statut");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CashSession_userId_idx" ON "CashSession"("userId");

-- CreateIndex
CREATE INDEX "CashSession_status_idx" ON "CashSession"("status");

-- CreateIndex
CREATE INDEX "CashSession_openedAt_idx" ON "CashSession"("openedAt");

-- CreateIndex
CREATE INDEX "Tarif_articleId_idx" ON "Tarif"("articleId");

-- CreateIndex
CREATE INDEX "Tarif_actif_idx" ON "Tarif"("actif");

-- CreateIndex
CREATE UNIQUE INDEX "Tarif_articleId_palier_key" ON "Tarif"("articleId", "palier");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_category_key" ON "UserPreference"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRule_ruleKey_key" ON "BusinessRule"("ruleKey");

-- CreateIndex
CREATE INDEX "BusinessRule_family_idx" ON "BusinessRule"("family");

-- CreateIndex
CREATE INDEX "BusinessRule_articleId_idx" ON "BusinessRule"("articleId");

-- CreateIndex
CREATE INDEX "BusinessRule_ruleType_idx" ON "BusinessRule"("ruleType");

-- CreateIndex
CREATE INDEX "BusinessRule_active_idx" ON "BusinessRule"("active");

-- CreateIndex
CREATE UNIQUE INDEX "PriceFormula_formulaKey_key" ON "PriceFormula"("formulaKey");

-- CreateIndex
CREATE INDEX "PriceFormula_family_idx" ON "PriceFormula"("family");

-- CreateIndex
CREATE INDEX "PriceFormula_articleId_idx" ON "PriceFormula"("articleId");

-- CreateIndex
CREATE INDEX "PriceFormula_active_idx" ON "PriceFormula"("active");

-- CreateIndex
CREATE INDEX "ArticleTemplate_family_idx" ON "ArticleTemplate"("family");

-- CreateIndex
CREATE INDEX "ArticleTemplate_active_idx" ON "ArticleTemplate"("active");

-- CreateIndex
CREATE INDEX "WorkflowTransitionRule_entity_fromStatut_idx" ON "WorkflowTransitionRule"("entity", "fromStatut");

-- CreateIndex
CREATE INDEX "WorkflowTransitionRule_entity_enabled_idx" ON "WorkflowTransitionRule"("entity", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTransitionRule_entity_fromStatut_toStatut_key" ON "WorkflowTransitionRule"("entity", "fromStatut", "toStatut");

-- CreateIndex
CREATE UNIQUE INDEX "ArticlePricingProfile_articleId_key" ON "ArticlePricingProfile"("articleId");

-- CreateIndex
CREATE INDEX "ArticlePricingProfile_family_idx" ON "ArticlePricingProfile"("family");

-- CreateIndex
CREATE INDEX "ArticlePricingProfile_status_idx" ON "ArticlePricingProfile"("status");

-- CreateIndex
CREATE INDEX "ArticlePricingProfile_active_idx" ON "ArticlePricingProfile"("active");

-- CreateIndex
CREATE INDEX "ProductOptionGroup_articleId_idx" ON "ProductOptionGroup"("articleId");

-- CreateIndex
CREATE INDEX "ProductOptionGroup_visiblePos_active_idx" ON "ProductOptionGroup"("visiblePos", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionGroup_articleId_fieldKey_key" ON "ProductOptionGroup"("articleId", "fieldKey");

-- CreateIndex
CREATE INDEX "ProductOptionValue_groupId_idx" ON "ProductOptionValue"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionValue_groupId_valueKey_key" ON "ProductOptionValue"("groupId", "valueKey");

-- CreateIndex
CREATE INDEX "DiscountTier_articleId_idx" ON "DiscountTier"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountTier_articleId_minQty_key" ON "DiscountTier"("articleId", "minQty");

-- CreateIndex
CREATE INDEX "UrgencyRule_articleId_idx" ON "UrgencyRule"("articleId");

-- CreateIndex
CREATE INDEX "MaterialPrice_articleId_idx" ON "MaterialPrice"("articleId");

-- CreateIndex
CREATE INDEX "MaterialPrice_materialKey_idx" ON "MaterialPrice"("materialKey");

-- CreateIndex
CREATE UNIQUE INDEX "PricingVariable_code_key" ON "PricingVariable"("code");

-- CreateIndex
CREATE INDEX "PricingVariable_scope_articleId_idx" ON "PricingVariable"("scope", "articleId");

-- CreateIndex
CREATE INDEX "FormulaVersion_articleId_status_idx" ON "FormulaVersion"("articleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaVersion_articleId_version_key" ON "FormulaVersion"("articleId", "version");

-- CreateIndex
CREATE INDEX "StockRule_articleId_idx" ON "StockRule"("articleId");

-- CreateIndex
CREATE INDEX "RuleVersion_entityType_entityId_idx" ON "RuleVersion"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "RuleVersion_createdAt_idx" ON "RuleVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_configKey_key" ON "SystemConfig"("configKey");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigVersion_version_key" ON "ConfigVersion"("version");

-- CreateIndex
CREATE INDEX "ConfigVersion_status_idx" ON "ConfigVersion"("status");

-- CreateIndex
CREATE INDEX "ConfigVersion_publishedAt_idx" ON "ConfigVersion"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_sku_key" ON "StockItem"("sku");

-- CreateIndex
CREATE INDEX "StockItem_category_idx" ON "StockItem"("category");

-- CreateIndex
CREATE INDEX "StockItem_paperType_grammage_idx" ON "StockItem"("paperType", "grammage");

-- CreateIndex
CREATE INDEX "StockItem_materialKey_idx" ON "StockItem"("materialKey");

-- CreateIndex
CREATE INDEX "StockItem_actif_idx" ON "StockItem"("actif");

-- CreateIndex
CREATE INDEX "StockItem_site_idx" ON "StockItem"("site");

-- CreateIndex
CREATE INDEX "StockMovement_stockItemId_idx" ON "StockMovement"("stockItemId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "FileAsset_clientId_idx" ON "FileAsset"("clientId");

-- CreateIndex
CREATE INDEX "FileAsset_commandeId_idx" ON "FileAsset"("commandeId");

-- CreateIndex
CREATE INDEX "FileAsset_studioBriefId_idx" ON "FileAsset"("studioBriefId");

-- CreateIndex
CREATE INDEX "FileAsset_metierTaskId_idx" ON "FileAsset"("metierTaskId");

-- CreateIndex
CREATE INDEX "FileAsset_category_idx" ON "FileAsset"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Proof_numero_key" ON "Proof"("numero");

-- CreateIndex
CREATE INDEX "Proof_statut_idx" ON "Proof"("statut");

-- CreateIndex
CREATE INDEX "Proof_commandeId_idx" ON "Proof"("commandeId");

-- CreateIndex
CREATE INDEX "Proof_clientId_idx" ON "Proof"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "Supplier_statut_idx" ON "Supplier"("statut");

-- CreateIndex
CREATE INDEX "Supplier_categorie_idx" ON "Supplier"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_numero_key" ON "PurchaseOrder"("numero");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_statut_idx" ON "PurchaseOrder"("statut");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "ProductionSlot_startAt_idx" ON "ProductionSlot"("startAt");

-- CreateIndex
CREATE INDEX "ProductionSlot_statut_idx" ON "ProductionSlot"("statut");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCatalog_key_key" ON "MaterialCatalog"("key");

-- CreateIndex
CREATE INDEX "MaterialCatalog_family_actif_idx" ON "MaterialCatalog"("family", "actif");

-- CreateIndex
CREATE INDEX "GrammageCatalog_materialId_idx" ON "GrammageCatalog"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammageCatalog_materialId_value_key" ON "GrammageCatalog"("materialId", "value");

-- CreateIndex
CREATE INDEX "SupplierPrice_articleNormalized_idx" ON "SupplierPrice"("articleNormalized");

-- CreateIndex
CREATE INDEX "SupplierPrice_supplierName_idx" ON "SupplierPrice"("supplierName");

-- CreateIndex
CREATE INDEX "SupplierPrice_actif_idx" ON "SupplierPrice"("actif");

-- CreateIndex
CREATE UNIQUE INDEX "SalePrice2026_sourceId_key" ON "SalePrice2026"("sourceId");

-- CreateIndex
CREATE INDEX "SalePrice2026_productNormalized_idx" ON "SalePrice2026"("productNormalized");

-- CreateIndex
CREATE INDEX "SalePrice2026_articleId_idx" ON "SalePrice2026"("articleId");

-- CreateIndex
CREATE INDEX "SalePrice2026_actif_priceType_idx" ON "SalePrice2026"("actif", "priceType");

-- CreateIndex
CREATE INDEX "SalePrice2026_adminModified_idx" ON "SalePrice2026"("adminModified");

-- CreateIndex
CREATE INDEX "PriceHistory_entityType_entityId_idx" ON "PriceHistory"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");

-- CreateIndex
CREATE INDEX "StockReservation_stockItemId_status_idx" ON "StockReservation"("stockItemId", "status");

-- CreateIndex
CREATE INDEX "StockReservation_commandeId_idx" ON "StockReservation"("commandeId");

-- CreateIndex
CREATE INDEX "ImportAnomaly_sheet_resolved_idx" ON "ImportAnomaly"("sheet", "resolved");

-- CreateIndex
CREATE INDEX "TeamMessage_createdAt_idx" ON "TeamMessage"("createdAt");

-- CreateIndex
CREATE INDEX "TeamMessage_pinned_idx" ON "TeamMessage"("pinned");

-- CreateIndex
CREATE INDEX "TeamMessageReply_messageId_idx" ON "TeamMessageReply"("messageId");

-- CreateIndex
CREATE INDEX "TeamSuggestion_status_idx" ON "TeamSuggestion"("status");

-- CreateIndex
CREATE INDEX "TeamSuggestion_votes_idx" ON "TeamSuggestion"("votes");

-- CreateIndex
CREATE INDEX "MetierTask_status_idx" ON "MetierTask"("status");

-- CreateIndex
CREATE INDEX "MetierTask_type_idx" ON "MetierTask"("type");

-- CreateIndex
CREATE INDEX "MetierTask_assigneeId_idx" ON "MetierTask"("assigneeId");

-- CreateIndex
CREATE INDEX "MetierTask_commandeId_idx" ON "MetierTask"("commandeId");

-- CreateIndex
CREATE INDEX "MetierTask_dueDate_idx" ON "MetierTask"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_matricule_key" ON "Employee"("matricule");

-- CreateIndex
CREATE INDEX "Employee_departement_idx" ON "Employee"("departement");

-- CreateIndex
CREATE INDEX "Employee_statut_idx" ON "Employee"("statut");

-- CreateIndex
CREATE INDEX "Employee_presenceStatut_idx" ON "Employee"("presenceStatut");

-- CreateIndex
CREATE INDEX "EmployeePresence_date_idx" ON "EmployeePresence"("date");

-- CreateIndex
CREATE INDEX "EmployeePresence_statut_idx" ON "EmployeePresence"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePresence_employeeId_date_key" ON "EmployeePresence"("employeeId", "date");

-- CreateIndex
CREATE INDEX "EmployeeAbsence_employeeId_idx" ON "EmployeeAbsence"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeAbsence_statut_idx" ON "EmployeeAbsence"("statut");

-- CreateIndex
CREATE INDEX "EmployeeAbsence_dateDebut_idx" ON "EmployeeAbsence"("dateDebut");

-- CreateIndex
CREATE INDEX "RhAnnouncement_createdAt_idx" ON "RhAnnouncement"("createdAt");

-- CreateIndex
CREATE INDEX "RhAnnouncement_pinned_idx" ON "RhAnnouncement"("pinned");

-- CreateIndex
CREATE INDEX "FinanceCharge_category_idx" ON "FinanceCharge"("category");

-- CreateIndex
CREATE INDEX "FinanceCharge_dateCharge_idx" ON "FinanceCharge"("dateCharge");

-- CreateIndex
CREATE INDEX "FiscalObligation_dateEcheance_idx" ON "FiscalObligation"("dateEcheance");

-- CreateIndex
CREATE INDEX "FiscalObligation_statut_idx" ON "FiscalObligation"("statut");

-- CreateIndex
CREATE INDEX "FiscalObligation_type_idx" ON "FiscalObligation"("type");

-- CreateIndex
CREATE INDEX "StockDirectSale_soldAt_idx" ON "StockDirectSale"("soldAt");

-- CreateIndex
CREATE INDEX "StockDirectSale_stockItemId_idx" ON "StockDirectSale"("stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionDossier_productionId_key" ON "ProductionDossier"("productionId");

-- CreateIndex
CREATE INDEX "ProductionDossier_commandeId_idx" ON "ProductionDossier"("commandeId");

-- CreateIndex
CREATE INDEX "ProductionDossier_statutGlobal_idx" ON "ProductionDossier"("statutGlobal");

-- CreateIndex
CREATE INDEX "ProductionDossierEtape_dossierId_idx" ON "ProductionDossierEtape"("dossierId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionDossierEtape_dossierId_ordre_key" ON "ProductionDossierEtape"("dossierId", "ordre");

-- CreateIndex
CREATE INDEX "ProductionIncident_dossierId_idx" ON "ProductionIncident"("dossierId");

-- CreateIndex
CREATE INDEX "ProductionIncident_statut_idx" ON "ProductionIncident"("statut");

-- CreateIndex
CREATE INDEX "StudioBrief_commandeId_idx" ON "StudioBrief"("commandeId");

-- CreateIndex
CREATE INDEX "StudioBrief_clientId_idx" ON "StudioBrief"("clientId");

-- CreateIndex
CREATE INDEX "StudioBrief_statut_idx" ON "StudioBrief"("statut");

-- CreateIndex
CREATE INDEX "StudioCreativeVersion_briefId_idx" ON "StudioCreativeVersion"("briefId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioCreativeVersion_briefId_version_key" ON "StudioCreativeVersion"("briefId", "version");

-- CreateIndex
CREATE INDEX "StudioPrepressCheck_briefId_idx" ON "StudioPrepressCheck"("briefId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioPrepressCheck_briefId_ordre_key" ON "StudioPrepressCheck"("briefId", "ordre");

-- CreateIndex
CREATE INDEX "CmCampaign_statut_idx" ON "CmCampaign"("statut");

-- CreateIndex
CREATE INDEX "CmCampaign_clientId_idx" ON "CmCampaign"("clientId");

-- CreateIndex
CREATE INDEX "CmCampaignPost_campaignId_idx" ON "CmCampaignPost"("campaignId");

-- CreateIndex
CREATE INDEX "CmCampaignPost_statut_idx" ON "CmCampaignPost"("statut");

-- CreateIndex
CREATE INDEX "CmMessageTemplate_category_idx" ON "CmMessageTemplate"("category");

-- CreateIndex
CREATE INDEX "CmRelance_clientId_idx" ON "CmRelance"("clientId");

-- CreateIndex
CREATE INDEX "CmRelance_statut_idx" ON "CmRelance"("statut");

-- CreateIndex
CREATE INDEX "CmRelance_dueDate_idx" ON "CmRelance"("dueDate");

-- CreateIndex
CREATE INDEX "RoleModulePermission_role_idx" ON "RoleModulePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RoleModulePermission_role_moduleId_key" ON "RoleModulePermission"("role", "moduleId");

-- CreateIndex
CREATE INDEX "UserModuleOverride_userId_idx" ON "UserModuleOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserModuleOverride_userId_moduleId_key" ON "UserModuleOverride"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteAnnexe_code_key" ON "SiteAnnexe"("code");

-- CreateIndex
CREATE INDEX "SiteAnnexe_statut_idx" ON "SiteAnnexe"("statut");

-- CreateIndex
CREATE INDEX "MaterialWaste_poste_idx" ON "MaterialWaste"("poste");

-- CreateIndex
CREATE INDEX "MaterialWaste_createdAt_idx" ON "MaterialWaste"("createdAt");

-- CreateIndex
CREATE INDEX "EmployeeEvaluation_employeeId_idx" ON "EmployeeEvaluation"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeEvaluation_employeeId_period_key" ON "EmployeeEvaluation"("employeeId", "period");

-- CreateIndex
CREATE INDEX "TickerMessage_active_idx" ON "TickerMessage"("active");

-- CreateIndex
CREATE INDEX "ClientNotificationLog_sentAt_idx" ON "ClientNotificationLog"("sentAt");

-- CreateIndex
CREATE INDEX "ClientNotificationLog_type_idx" ON "ClientNotificationLog"("type");

-- CreateIndex
CREATE INDEX "RecruitCandidate_stage_idx" ON "RecruitCandidate"("stage");

-- CreateIndex
CREATE INDEX "RecruitCandidate_createdAt_idx" ON "RecruitCandidate"("createdAt");

-- CreateIndex
CREATE INDEX "Payslip_period_idx" ON "Payslip"("period");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_employeeId_period_key" ON "Payslip"("employeeId", "period");

-- CreateIndex
CREATE INDEX "EmployeeAdvance_employeeId_idx" ON "EmployeeAdvance"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeAdvance_statut_idx" ON "EmployeeAdvance"("statut");

-- CreateIndex
CREATE INDEX "ProofVersion_proofId_idx" ON "ProofVersion"("proofId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_code_key" ON "Equipment"("code");

-- CreateIndex
CREATE INDEX "Equipment_category_idx" ON "Equipment"("category");

-- CreateIndex
CREATE INDEX "Equipment_etat_idx" ON "Equipment"("etat");

-- CreateIndex
CREATE INDEX "Equipment_employeeId_idx" ON "Equipment"("employeeId");

-- CreateIndex
CREATE INDEX "Equipment_site_idx" ON "Equipment"("site");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTicket_numero_key" ON "MaintenanceTicket"("numero");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_statut_idx" ON "MaintenanceTicket"("statut");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_priorite_idx" ON "MaintenanceTicket"("priorite");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_machineId_idx" ON "MaintenanceTicket"("machineId");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_equipmentId_idx" ON "MaintenanceTicket"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TalkConversation_commandeId_key" ON "TalkConversation"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "TalkConversation_devisId_key" ON "TalkConversation"("devisId");

-- CreateIndex
CREATE UNIQUE INDEX "TalkConversation_productionDossierId_key" ON "TalkConversation"("productionDossierId");

-- CreateIndex
CREATE INDEX "TalkConversation_type_idx" ON "TalkConversation"("type");

-- CreateIndex
CREATE INDEX "TalkConversation_serviceKey_idx" ON "TalkConversation"("serviceKey");

-- CreateIndex
CREATE INDEX "TalkConversationMember_userId_idx" ON "TalkConversationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TalkConversationMember_conversationId_userId_key" ON "TalkConversationMember"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "TalkMessage_conversationId_createdAt_idx" ON "TalkMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "TalkMessageRead_userId_idx" ON "TalkMessageRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TalkMessageRead_messageId_userId_key" ON "TalkMessageRead"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TalkMessageReaction_messageId_userId_emoji_key" ON "TalkMessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "TalkAttachment_conversationId_idx" ON "TalkAttachment"("conversationId");

-- CreateIndex
CREATE INDEX "TalkAttachment_messageId_idx" ON "TalkAttachment"("messageId");

-- CreateIndex
CREATE INDEX "TalkAttachment_commandeId_idx" ON "TalkAttachment"("commandeId");

-- CreateIndex
CREATE INDEX "TalkAttachmentDownload_attachmentId_idx" ON "TalkAttachmentDownload"("attachmentId");

-- CreateIndex
CREATE INDEX "TalkMessageTask_messageId_idx" ON "TalkMessageTask"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "QualiteControle_commandeId_key" ON "QualiteControle"("commandeId");

-- CreateIndex
CREATE INDEX "QualiteControle_statut_idx" ON "QualiteControle"("statut");

-- CreateIndex
CREATE INDEX "AccessRequest_statut_idx" ON "AccessRequest"("statut");

-- CreateIndex
CREATE INDEX "AccessRequest_email_idx" ON "AccessRequest"("email");

-- CreateIndex
CREATE INDEX "AccessRequest_createdAt_idx" ON "AccessRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReclamation" ADD CONSTRAINT "ClientReclamation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevisLigne" ADD CONSTRAINT "DevisLigne_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeBlocage" ADD CONSTRAINT "CommandeBlocage_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeLigne" ADD CONSTRAINT "CommandeLigne_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEtape" ADD CONSTRAINT "ProductionEtape_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Livraison" ADD CONSTRAINT "Livraison_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Livraison" ADD CONSTRAINT "Livraison_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ArticlePricingProfile"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountTier" ADD CONSTRAINT "DiscountTier_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ArticlePricingProfile"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrgencyRule" ADD CONSTRAINT "UrgencyRule_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ArticlePricingProfile"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPrice" ADD CONSTRAINT "MaterialPrice_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ArticlePricingProfile"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaVersion" ADD CONSTRAINT "FormulaVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ArticlePricingProfile"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRule" ADD CONSTRAINT "StockRule_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ArticlePricingProfile"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_studioBriefId_fkey" FOREIGN KEY ("studioBriefId") REFERENCES "StudioBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_metierTaskId_fkey" FOREIGN KEY ("metierTaskId") REFERENCES "MetierTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammageCatalog" ADD CONSTRAINT "GrammageCatalog_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPrice" ADD CONSTRAINT "SupplierPrice_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMessageReply" ADD CONSTRAINT "TeamMessageReply_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TeamMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetierTask" ADD CONSTRAINT "MetierTask_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetierTask" ADD CONSTRAINT "MetierTask_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePresence" ADD CONSTRAINT "EmployeePresence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAbsence" ADD CONSTRAINT "EmployeeAbsence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDirectSale" ADD CONSTRAINT "StockDirectSale_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDirectSale" ADD CONSTRAINT "StockDirectSale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDossier" ADD CONSTRAINT "ProductionDossier_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDossier" ADD CONSTRAINT "ProductionDossier_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDossierEtape" ADD CONSTRAINT "ProductionDossierEtape_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "ProductionDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionIncident" ADD CONSTRAINT "ProductionIncident_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "ProductionDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioBrief" ADD CONSTRAINT "StudioBrief_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioBrief" ADD CONSTRAINT "StudioBrief_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioCreativeVersion" ADD CONSTRAINT "StudioCreativeVersion_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "StudioBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPrepressCheck" ADD CONSTRAINT "StudioPrepressCheck_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "StudioBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmCampaign" ADD CONSTRAINT "CmCampaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmCampaignPost" ADD CONSTRAINT "CmCampaignPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CmCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmRelance" ADD CONSTRAINT "CmRelance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmRelance" ADD CONSTRAINT "CmRelance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CmMessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleOverride" ADD CONSTRAINT "UserModuleOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialWaste" ADD CONSTRAINT "MaterialWaste_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEvaluation" ADD CONSTRAINT "EmployeeEvaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNotificationLog" ADD CONSTRAINT "ClientNotificationLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdvance" ADD CONSTRAINT "EmployeeAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofVersion" ADD CONSTRAINT "ProofVersion_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "Proof"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkConversation" ADD CONSTRAINT "TalkConversation_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkConversation" ADD CONSTRAINT "TalkConversation_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkConversation" ADD CONSTRAINT "TalkConversation_productionDossierId_fkey" FOREIGN KEY ("productionDossierId") REFERENCES "ProductionDossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkConversationMember" ADD CONSTRAINT "TalkConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TalkConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkConversationMember" ADD CONSTRAINT "TalkConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkMessage" ADD CONSTRAINT "TalkMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TalkConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkMessage" ADD CONSTRAINT "TalkMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "TalkMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkMessageRead" ADD CONSTRAINT "TalkMessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TalkMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkMessageReaction" ADD CONSTRAINT "TalkMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TalkMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkAttachment" ADD CONSTRAINT "TalkAttachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TalkConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkAttachment" ADD CONSTRAINT "TalkAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TalkMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkAttachmentVersion" ADD CONSTRAINT "TalkAttachmentVersion_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "TalkAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkAttachmentDownload" ADD CONSTRAINT "TalkAttachmentDownload_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "TalkAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkMessageTask" ADD CONSTRAINT "TalkMessageTask_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TalkMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualiteControle" ADD CONSTRAINT "QualiteControle_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

