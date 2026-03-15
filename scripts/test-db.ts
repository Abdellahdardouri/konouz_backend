import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log('DB connected successfully!');
  const count = await prisma.product.count();
  console.log(`Products in DB: ${count}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('DB error:', e.message);
  process.exit(1);
});
