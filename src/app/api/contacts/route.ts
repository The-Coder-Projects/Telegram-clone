import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addContactSchema } from "@/lib/validators";

function normalizeIdentifier(identifier: string) {
  const raw = identifier.trim();
  const username = raw.replace(/^@/, "").toLowerCase();
  const email = raw.toLowerCase();
  const phone = raw.replace(/[^\d+]/g, "");
  return { raw, username, email, phone };
}

export async function GET() {
  const session = await auth();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { ownerId: meId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      contact: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          bio: true,
          lastSeen: true,
        },
      },
    },
  });

  return NextResponse.json({
    contacts: contacts.map((c) => ({ ...c.contact, addedAt: c.createdAt })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = addContactSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { username, email, phone } = normalizeIdentifier(parsed.data.identifier);

  // Build OR conditions dynamically
  const orConditions: Array<Record<string, any>> = [
    { username: { equals: username, mode: "insensitive" } },
  ];
  if (email && email.includes("@")) {
    orConditions.push({ email: { equals: email, mode: "insensitive" } });
  }
  if (phone && phone.length > 0) {
    orConditions.push({ phone: { equals: phone } });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: orConditions,
    },
    select: { id: true },
  });
  if (!user || user.id === meId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.contact.upsert({
    where: { ownerId_contactId: { ownerId: meId, contactId: user.id } },
    update: {},
    create: { ownerId: meId, contactId: user.id },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

