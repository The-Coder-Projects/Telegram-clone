import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forwardMessageSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

const includeMessage = {
  sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
  reads: { select: { userId: true, readAt: true } },
  replyTo: {
    select: {
      id: true,
      content: true,
      senderId: true,
      sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  },
  reactions: { select: { userId: true, emoji: true, createdAt: true } },
  attachments: {
    select: {
      id: true,
      kind: true,
      url: true,
      thumbUrl: true,
      mime: true,
      size: true,
      width: true,
      height: true,
      durationMs: true,
      fileName: true,
      createdAt: true,
    },
  },
} as const;

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = forwardMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { toChatId, messageId } = parsed.data;

  const [isFromMember, isToMember] = await Promise.all([
    prisma.message.findFirst({
      where: { id: messageId, chat: { members: { some: { userId } } }, deletedAt: null },
      select: { id: true, type: true, content: true },
    }),
    prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: toChatId, userId } },
      select: { chatId: true },
    }),
  ]);

  if (!isFromMember) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isToMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await prisma.message.create({
    data: {
      chatId: toChatId,
      senderId: userId,
      type: "text",
      content: isFromMember.content,
    },
    include: includeMessage,
  });

  return NextResponse.json({ message });
}

