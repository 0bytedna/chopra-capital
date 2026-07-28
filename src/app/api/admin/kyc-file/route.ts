// Streams a private KYC document to an authenticated administrator.

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

  const document = await prisma.kycDocument.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uploadsRoot = path.resolve(process.cwd(), "uploads", "kyc");
  const resolved = path.resolve(document.filePath);
  if (resolved !== uploadsRoot && !resolved.startsWith(`${uploadsRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(resolved);
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }

  const extension = path.extname(resolved).toLowerCase();
  const safeName = document.fileName.replace(/[\r\n"\\]/g, "_");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}