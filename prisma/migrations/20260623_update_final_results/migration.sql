-- First, drop the old unique constraint if exists
DROP INDEX IF EXISTS "final_results_review_id_intern_id_key";

-- Alter final_results table to add new columns and rename
ALTER TABLE final_results RENAME TO final_results_old;

-- Create new final_results table with correct schema
CREATE TABLE "final_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "review_id" TEXT NOT NULL,
    "presenter_id" TEXT NOT NULL,
    "presenter_name" TEXT NOT NULL,
    "hr_score" REAL NOT NULL DEFAULT 0,
    "peer_average" REAL NOT NULL DEFAULT 0,
    "presentation_score" REAL NOT NULL DEFAULT 0,
    "total_penalty" REAL NOT NULL DEFAULT 0,
    "final_score" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "final_results_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Project_reviews" ("id") ON DELETE CASCADE,
    CONSTRAINT "final_results_review_id_presenter_id_key" UNIQUE ("review_id", "presenter_id")
);

-- Create index for faster queries
CREATE INDEX "final_results_review_id_idx" ON "final_results"("review_id");
CREATE INDEX "final_results_presenter_id_idx" ON "final_results"("presenter_id");

-- Drop old table
DROP TABLE final_results_old;

-- Ensure evaluations have cascade delete
-- Note: SQLite doesn't support ALTER COLUMN for constraints, so we keep the schema as is
