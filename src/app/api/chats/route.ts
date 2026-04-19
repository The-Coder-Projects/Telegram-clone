import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDirectChatSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chats = await prisma.chatMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    select: {
      chat: {
        select: {
          id: true,
          type: true,
          name: true,
          photo: true,
          pinnedMessageId: true,
          createdAt: true,
          pinnedMessage: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
              deletedAt: true,
              editedAt: true,
            },
          },
          members: {
            select: {
              user: { select: { id: true, name: true, username: true, avatarUrl: true, lastSeen: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, content: true, createdAt: true, senderId: true, deletedAt: true, editedAt: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ chats: chats.map((c) => c.chat) });
}

export async function POST(req: Request) {
  const session = await auth();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createDirectChatSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { userId, username, identifier } = parsed.data;
  if (!userId && !username && !identifier) {
    return NextResponse.json(
      { error: "userId or username or identifier required" },
      { status: 400 }
    );
  }

  const normalizedIdentifier = identifier?.trim() ?? null;
  const identifierUsername = normalizedIdentifier
    ? normalizedIdentifier.replace(/^@/, "").toLowerCase()
    : null;
  const identifierEmail = normalizedIdentifier
    ? normalizedIdentifier.toLowerCase()
    : null;
  const identifierPhone = normalizedIdentifier
    ? normalizedIdentifier.replace(/[^\d+]/g, "")
    : null;

  const other = await prisma.user.findFirst({
    where: userId
      ? { id: userId }
      : username
        ? { username }
        : (() => {
            const OR: Array<
              | { email: string }
              | { username: string }
              | { phone: string }
            > = [];
            if (identifierEmail) OR.push({ email: identifierEmail });
            if (identifierUsername) OR.push({ username: identifierUsername });
            if (identifierPhone) OR.push({ phone: identifierPhone });
            return { OR };
          })(),
    select: { id: true, isPrivate: true },
  });
  if (!other || other.id === meId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Private accounts require a chat request (unless already a saved contact).
  if (other.isPrivate) {
    const alreadyContact = await prisma.contact.findUnique({
      where: { ownerId_contactId: { ownerId: other.id, contactId: meId } },
      select: { ownerId: true },
    });

    if (!alreadyContact) {
      const req = await prisma.chatRequest.upsert({
        where: { fromUserId_toUserId: { fromUserId: meId, toUserId: other.id } },
        update: { status: "pending", respondedAt: null },
        create: { fromUserId: meId, toUserId: other.id },
        select: { id: true, status: true },
      });

      return NextResponse.json(
        { pending: true, requestId: req.id, status: req.status },
        { status: 202 }
      );
    }
  }

  // Find existing direct chat between the two users.
  const existing = await prisma.chat.findFirst({
    where: {
      type: "direct",
      AND: [
        { members: { some: { userId: meId } } },
        { members: { some: { userId: other.id } } },
        // Ensure the chat doesn't contain anyone else.
        { members: { every: { userId: { in: [meId, other.id] } } } },
      ],
    },
    include: {
      members: {
        select: {
          role: true,
          user: {
            select: { id: true, name: true, username: true, avatarUrl: true, lastSeen: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, createdAt: true, senderId: true, deletedAt: true, editedAt: true },
      },
    },
  });

  if (existing) return NextResponse.json({ chat: existing, created: false });

  const chat = await prisma.chat.create({
    data: {
      type: "direct",
      members: {
        create: [{ userId: meId, role: "member" }, { userId: other.id, role: "member" }],
      },
    },
    include: {
      members: {
        select: {
          role: true,
          user: {
            select: { id: true, name: true, username: true, avatarUrl: true, lastSeen: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, createdAt: true, senderId: true, deletedAt: true, editedAt: true },
      },
    },
  });

  return NextResponse.json({ chat, created: true }, { status: 201 });
}

