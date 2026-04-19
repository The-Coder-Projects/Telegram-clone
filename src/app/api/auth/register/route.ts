import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, username, name, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [
      { email: { equals: email, mode: "insensitive" } },
      { username: { equals: username, mode: "insensitive" } }
    ] },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Email or username already in use" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name,
      passwordHash,
      lastSeen: new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json({ userId: user.id }, { status: 201 });
}

