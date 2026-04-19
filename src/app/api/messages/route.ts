import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listMessagesQuerySchema, sendMessageSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = listMessagesQuerySchema.safeParse({
    chatId: url.searchParams.get("chatId") ?? "",
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const { chatId, cursor, limit } = parsed.data;

  const isMember = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    select: { chatId: true },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.message.findMany({
    where: { chatId, deletedAt: null, hiddenBy: { none: { userId } } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    include: {
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
    },
  });

  const nextCursor = messages.length > limit ? messages[limit]?.id : null;
  const items = messages.slice(0, limit);

  return NextResponse.json({ messages: items, nextCursor });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { chatId, content, replyToId } = parsed.data;

  const isMember = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    select: { chatId: true },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId: userId,
      type: "text",
      content,
      replyToId: replyToId ?? null,
    },
    include: {
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
    },
  });

  return NextResponse.json({ message });
}

