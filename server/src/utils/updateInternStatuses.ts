import { getPrisma } from '../lib/prisma';

export async function updateInternStatuses() {
  const prisma = getPrisma();
  const now = new Date();

  // YetToJoin -> Allotted
  await prisma.intern.updateMany({
    where: {
      start_date: { lte: now },
      end_date: { gte: now },
      status: 'YetToJoin',
    },
    data: {
      status: 'Allotted',
    },
  });

  // Allotted -> Completed
  await prisma.intern.updateMany({
    where: {
      end_date: { lt: now },
      status: 'Allotted',
    },
    data: {
      status: 'Completed',
    },
  });

  // Waitlisted -> Left
  await prisma.intern.updateMany({
    where: {
      end_date: { lt: now },
      status: 'Waitlisted',
    },
    data: {
      status: 'Left',
    },
  });
}