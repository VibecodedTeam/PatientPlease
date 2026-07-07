import { PrismaPg } from '@prisma/adapter-pg';
import prismaClientPackage from '@prisma/client';

const { PrismaClient } = prismaClientPackage;

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
