import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:51218/postgres?sslmode=disable' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    const res = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: 'test@example.com', mode: 'insensitive' } },
          { username: { equals: 'test', mode: 'insensitive' } }
        ]
      }
    });
    console.log('success:', res);
  } catch(e: any) {
    console.error('ERROR NAME:', e.name);
    console.error('ERROR CODE:', e.code);
    console.error('ERROR MESSAGE:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
