/*
  Warnings:

  - Added the required column `end_date` to the `interns` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_interns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "intern_type" TEXT NOT NULL,
    "college" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "graduation_year" INTEGER NOT NULL,
    "cgpa" REAL NOT NULL,
    "twelfth_marks" REAL,
    "tenth_marks" REAL,
    "reference_name" TEXT,
    "skills" TEXT NOT NULL,
    "preferred_domain" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "end_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "assigned_guide_id" TEXT,
    "Project_title" TEXT,
    "Project_details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interns_assigned_guide_id_fkey" FOREIGN KEY ("assigned_guide_id") REFERENCES "guides" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_interns" ("assigned_guide_id", "branch", "cgpa", "college", "created_at", "duration_months", "full_name", "graduation_year", "id", "intern_type", "phone", "preferred_domain", "Project_details", "Project_title", "skills", "start_date", "status") SELECT "assigned_guide_id", "branch", "cgpa", "college", "created_at", "duration_months", "full_name", "graduation_year", "id", "intern_type", "phone", "preferred_domain", "Project_details", "Project_title", "skills", "start_date", "status" FROM "interns";
DROP TABLE "interns";
ALTER TABLE "new_interns" RENAME TO "interns";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
