/*
  Warnings:

  - A unique constraint covering the columns `[p_no]` on the table `interns` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "interns_p_no_key" ON "interns"("p_no");
