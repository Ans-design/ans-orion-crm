-- V12 Lot 7: PermissionPolicyMeta singleton

CREATE TABLE IF NOT EXISTS "PermissionPolicyMeta" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL
);

INSERT OR IGNORE INTO "PermissionPolicyMeta" ("id", "version", "updatedAt")
VALUES ('singleton', 1, CURRENT_TIMESTAMP);
