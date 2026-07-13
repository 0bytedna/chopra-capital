// GET /api/admin/kyc-file?id=<docId> — streams a KYC upload to an admin.
// Files live outside /public on purpose; this is the only way to read them.

import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { getFullSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(request: NextRequest) {
  const session = await getFullSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const doc = await prisma.kycDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Defence in depth: only ever serve files from the uploads directory.
  const uploadsRoot = path.join(process.cwd(), "uploads");
  const resolved = path.resolve(doc.filePath);
  if (!resolved.startsWith(uploadsRoot)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(resolved);
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypes[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
