import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Hard isolation: During tests (Vitest), redirect unmocked queries to in-memory SQLite to protect live dev.db
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const dbPath = isTestEnv ? ':memory:' : path.resolve(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });

export const prisma =
  globalForPrisma.prisma &&
  'payoutTransaction' in globalForPrisma.prisma &&
  'serpQuery' in globalForPrisma.prisma &&
  'serpItem' in globalForPrisma.prisma
    ? globalForPrisma.prisma
    : new PrismaClient({
        adapter,
      });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
