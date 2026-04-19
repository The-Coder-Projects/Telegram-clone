import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteMessageSchema, editMessageSchema } from "@/lib/validators";
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

export async function PATCH(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId: pathMessageId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = editMessageSchema.safeParse({ ...(body ?? {}), messageId: pathMessageId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { messageId, content } = parsed.data;

  const existing = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, chatId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.senderId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isMember = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId: existing.chatId, userId } },
    select: { chatId: true },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await prisma.message.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
    include: includeMessage,
  });

  return NextResponse.json({ message });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId: pathMessageId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = deleteMessageSchema.safeParse({
    messageId: pathMessageId,
    scope: url.searchParams.get("scope") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { messageId, scope } = parsed.data;

  const existing = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, chatId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMember = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId: existing.chatId, userId } },
    select: { chatId: true },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (scope === "me") {
    await prisma.messageHidden.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { hiddenAt: new Date() },
      create: { messageId, userId },
    });
    return NextResponse.json({ ok: true, scope: "me" });
  }

  if (existing.senderId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date(), content: "" },
    include: includeMessage,
  });

  return NextResponse.json({ ok: true, scope: "everyone", message });
}

