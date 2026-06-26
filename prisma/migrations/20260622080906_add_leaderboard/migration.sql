-- CreateTable
CREATE TABLE "Leaderboard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "review_id" TEXT NOT NULL,
    "intern_id" TEXT NOT NULL,
    "intern_name" TEXT NOT NULL,
    "hr_score" REAL NOT NULL,
    "peer_average" REAL NOT NULL,
    "penalty" REAL NOT NULL,
    "final_score" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
