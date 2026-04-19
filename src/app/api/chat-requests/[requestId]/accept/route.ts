import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  const session = await auth();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const req = await prisma.chatRequest.findFirst({
    where: { id: requestId, toUserId: meId, status: "pending" },
    select: { id: true, fromUserId: true, toUserId: true },
  });
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Make them contacts (mutual) to represent acceptance.
  await prisma.contact.upsert({
    where: { ownerId_contactId: { ownerId: meId, contactId: req.fromUserId } },
    update: {},
    create: { ownerId: meId, contactId: req.fromUserId },
  });

  await prisma.contact.upsert({
    where: { ownerId_contactId: { ownerId: req.fromUserId, contactId: meId } },
    update: {},
    create: { ownerId: req.fromUserId, contactId: meId },
  });

  await prisma.chatRequest.update({
    where: { id: req.id },
    data: { status: "accepted", respondedAt: new Date() },
  });

  // Create or return direct chat.
  const existing = await prisma.chat.findFirst({
    where: {
      type: "direct",
      AND: [
        { members: { some: { userId: meId } } },
        { members: { some: { userId: req.fromUserId } } },
        { members: { every: { userId: { in: [meId, req.fromUserId] } } } },
      ],
    },
    select: { id: true },
  });

  if (existing) return NextResponse.json({ chatId: existing.id, created: false });

  const chat = await prisma.chat.create({
    data: {
      type: "direct",
      members: {
        create: [
          { userId: meId, role: "member" },
          { userId: req.fromUserId, role: "member" },
        ],
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ chatId: chat.id, created: true }, { status: 201 });
}

