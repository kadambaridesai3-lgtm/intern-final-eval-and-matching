import prisma from './server/src/lib/prisma';

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  try {
    const count = await prisma.intern.count();
    console.log('Query Succeeded. Intern count:', count);
  } catch (error) {
    console.error('Query Failed.');
    console.error(error);
  } finally {
    await prisma.\();
  }
}

main();
