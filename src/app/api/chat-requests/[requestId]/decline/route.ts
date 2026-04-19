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
    select: { id: true },
  });
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.chatRequest.update({
    where: { id: req.id },
    data: { status: "declined", respondedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

