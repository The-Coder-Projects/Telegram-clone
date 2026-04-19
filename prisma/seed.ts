import { PrismaClient } from "../src/generated/prisma/client";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

loadEnv({ path: ".env.local" });
loadEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const passwordHash = await bcrypt.hash("password", 10);

  const alice = await prisma.user.upsert({
    where: { username: "alice" },
    update: { passwordHash, email: "alice@example.com" },
    create: {
      name: "Alice",
      username: "alice",
      email: "alice@example.com",
      phone: "+15550000001",
      passwordHash,
      bio: "Hello from Alice",
      lastSeen: new Date(),
    },
  });

  const bob = await prisma.user.upsert({
    where: { username: "bob" },
    update: { passwordHash, email: "bob@example.com" },
    create: {
      name: "Bob",
      username: "bob",
      email: "bob@example.com",
      phone: "+15550000002",
      passwordHash,
      bio: "Hello from Bob",
      lastSeen: new Date(),
    },
  });

  const chat = await prisma.chat.create({
    data: {
      type: "direct",
      members: {
        create: [
          { userId: alice.id, role: "member" },
          { userId: bob.id, role: "member" },
        ],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        chatId: chat.id,
        senderId: alice.id,
        type: "text",
        content: "Hey Bob 👋",
      },
      {
        chatId: chat.id,
        senderId: bob.id,
        type: "text",
        content: "Hey Alice! Ready to build this?",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

