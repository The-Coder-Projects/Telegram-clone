import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalWithPrisma = globalThis as GlobalWithPrisma;

// Assign to the global IMMEDIATELY (before any export) so that concurrent
// module evaluations in Next.js dev mode don't each call createPrismaClient()
// and race against Prisma 7's single-writer WASM compiler.
if (!globalWithPrisma.prisma) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Please add DATABASE_URL to your .env file.");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  globalWithPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalWithPrisma.prisma;
