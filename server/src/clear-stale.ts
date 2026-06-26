import { getPrisma } from './lib/prisma';
const prisma = getPrisma();

async function main() {
  await prisma.finalInternshipEvaluation.deleteMany({});
  await prisma.guideFeedback.deleteMany({});
  await prisma.attendanceSummary.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  console.log('Successfully cleared all new evaluation tables!');
}

main().catch(console.error);
