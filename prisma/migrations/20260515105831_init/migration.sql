-- CreateTable
CREATE TABLE "interns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    --"email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "p_no" TEXT NOT NULL,
    "intern_type" TEXT NOT NULL,
    "college" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "graduation_year" INTEGER NOT NULL,
    "cgpa" REAL NOT NULL,
    "skills" TEXT NOT NULL,
    "preferred_domain" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "assigned_guide_id" TEXT,
    "Project_title" TEXT,
    "Project_details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interns_assigned_guide_id_fkey" FOREIGN KEY ("assigned_guide_id") REFERENCES "guides" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "expertise_domains" TEXT NOT NULL,
    "required_skills" TEXT NOT NULL,
    "preferred_intern_types" TEXT NOT NULL,
    "max_capacity" INTEGER NOT NULL DEFAULT 4,
    "is_complete" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "match_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intern_id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "match_score" REAL NOT NULL,
    "matched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" DATETIME,
    "Allotted_at" DATETIME,
    "notes" TEXT,
    CONSTRAINT "match_logs_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "interns" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "match_logs_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
--CREATE UNIQUE INDEX "interns_email_key" ON "interns"("email");
