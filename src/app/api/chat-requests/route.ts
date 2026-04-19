import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const incoming = await prisma.chatRequest.findMany({
    where: { toUserId: meId, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      fromUser: {
        select: { id: true, name: true, username: true, avatarUrl: true, lastSeen: true },
      },
    },
  });

  const outgoing = await prisma.chatRequest.findMany({
    where: { fromUserId: meId, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      toUser: {
        select: { id: true, name: true, username: true, avatarUrl: true, lastSeen: true },
      },
    },
  });

  return NextResponse.json({ incoming, outgoing });
}

