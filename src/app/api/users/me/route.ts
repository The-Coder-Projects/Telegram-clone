import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      isPrivate: true,
    },
  });

  return NextResponse.json({ me });
}

const patchSchema = z.object({
  isPrivate: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: meId },
    data: parsed.data,
    select: { isPrivate: true },
  });

  return NextResponse.json({ me: updated });
}

