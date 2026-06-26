-- CreateTable
CREATE TABLE "Project_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "batch_name" TEXT NOT NULL,
    "review_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "review_id" TEXT NOT NULL,
    "presenter_id" TEXT NOT NULL,
    "presenter_name" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "is_hr" BOOLEAN NOT NULL DEFAULT false,
    "technical" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "understanding" INTEGER NOT NULL,
    "problem_solving" INTEGER NOT NULL,
    "innovation" INTEGER NOT NULL,
    "documentation" INTEGER NOT NULL,
    "qa_handling" INTEGER NOT NULL,
    "presentation" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluations_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Project_reviews" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytical_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intern_id" TEXT NOT NULL,
    "total_penalty" REAL NOT NULL DEFAULT 0,
    "final_score" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "final_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "review_id" TEXT NOT NULL,
    "intern_id" TEXT NOT NULL,
    "hr_score" REAL NOT NULL,
    "peer_average" REAL NOT NULL,
    "presentation_score" REAL NOT NULL,
    "analytical_penalty" REAL NOT NULL,
    "final_score" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
