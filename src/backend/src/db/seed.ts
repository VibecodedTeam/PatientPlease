import 'dotenv/config';
import { prisma } from './prisma.js';
import { runSeed } from './seed/index.js';

runSeed(prisma)
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
