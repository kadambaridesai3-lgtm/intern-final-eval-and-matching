import { getPrisma } from '../lib/prisma';

export async function generateNextInternId(): Promise<string> {
  const prisma = getPrisma();
  
  const interns = await prisma.intern.findMany({
    select: { intern_id: true }
  });

  let maxNum = 0;
  for (const intern of interns) {
    if (intern.intern_id && intern.intern_id.startsWith('INT')) {
      const numPart = parseInt(intern.intern_id.substring(3));
      if (!Number.isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  return 'INT' + String(nextNum).padStart(4, '0');
}
