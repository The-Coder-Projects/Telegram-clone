import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSearchSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = userSearchSchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const { q, limit } = parsed.data;
  const needle = q.trim().replace(/^@/, "");

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: needle, mode: "insensitive" } },
        { name: { contains: needle, mode: "insensitive" } },
      ],
      NOT: { id: userId },
    },
    take: limit,
    select: { id: true, name: true, username: true, avatarUrl: true, lastSeen: true },
  });

  return NextResponse.json({ users });
}

