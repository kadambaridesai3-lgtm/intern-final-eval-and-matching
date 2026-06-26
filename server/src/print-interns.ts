import { getPrisma } from './lib/prisma';
const prisma = getPrisma();

async function main() {
  const interns = await prisma.intern.findMany();
  console.log('Total interns:', interns.length);
  console.log('Sample interns:', interns.slice(0, 5));
}

main().catch(console.error);
