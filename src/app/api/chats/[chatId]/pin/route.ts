import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pinMessageSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId: pathChatId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = pinMessageSchema.safeParse({ ...(body ?? {}), chatId: pathChatId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { chatId, messageId } = parsed.data;

  const isMember = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    select: { chatId: true },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const msg = await prisma.message.findFirst({
    where: { id: messageId, chatId, deletedAt: null },
    select: { id: true },
  });
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { pinnedMessageId: messageId },
    select: { id: true, pinnedMessageId: true },
  });

  return NextResponse.json({ chat });
}

