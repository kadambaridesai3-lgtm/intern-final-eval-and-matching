-- DropIndex
DROP INDEX "interns_p_no_key";

-- AlterTable
ALTER TABLE "interns" ADD COLUMN "department" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "p_no" TEXT,
    "department" TEXT NOT NULL,
    "expertise_domains" TEXT NOT NULL,
    "required_skills" TEXT NOT NULL,
    "preferred_intern_types" TEXT NOT NULL,
    "max_capacity" INTEGER NOT NULL DEFAULT 20,
    "is_complete" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_guides" ("created_at", "department", "expertise_domains", "full_name", "id", "is_complete", "max_capacity", "preferred_intern_types", "required_skills") SELECT "created_at", "department", "expertise_domains", "full_name", "id", "is_complete", "max_capacity", "preferred_intern_types", "required_skills" FROM "guides";
DROP TABLE "guides";
ALTER TABLE "new_guides" RENAME TO "guides";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
