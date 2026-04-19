import { NextResponse } from "next/server";

export async function POST() {
  const hasCloudinary =
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinary) {
    return NextResponse.json(
      { error: "Cloudinary env vars not configured" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: "Not implemented in Phase 1" },
    { status: 501 }
  );
}

