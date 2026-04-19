import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      members: { some: { userId } },
    },
    select: {
      id: true,
      type: true,
      name: true,
      photo: true,
      createdAt: true,
      members: {
        select: {
          role: true,
          user: { select: { id: true, name: true, username: true, avatarUrl: true, lastSeen: true } },
        },
      },
    },
  });

  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ chat });
}

