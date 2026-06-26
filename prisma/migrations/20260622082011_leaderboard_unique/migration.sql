/*
  Warnings:

  - A unique constraint covering the columns `[review_id,intern_id]` on the table `Leaderboard` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Leaderboard_review_id_intern_id_key" ON "Leaderboard"("review_id", "intern_id");
