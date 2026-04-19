import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reactMessageSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId: pathMessageId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = reactMessageSchema.safeParse({ ...(body ?? {}), messageId: pathMessageId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { messageId, emoji } = parsed.data;

  const message = await prisma.message.findFirst({
    where: { id: messageId, deletedAt: null, chat: { members: { some: { userId } } } },
    select: { id: true, chatId: true },
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
    select: { emoji: true },
  });

  if (existing) {
    await prisma.messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });
  } else {
    await prisma.messageReaction.create({
      data: { messageId, userId, emoji },
    });
  }

  const reactions = await prisma.messageReaction.findMany({
    where: { messageId },
    select: { userId: true, emoji: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messageId, chatId: message.chatId, reactions });
}

