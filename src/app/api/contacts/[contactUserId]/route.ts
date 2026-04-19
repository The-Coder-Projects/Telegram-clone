import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ contactUserId: string }> }
) {
  const { contactUserId } = await params;
  const session = await auth();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.contact.delete({
    where: { ownerId_contactId: { ownerId: meId, contactId: contactUserId } },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}

