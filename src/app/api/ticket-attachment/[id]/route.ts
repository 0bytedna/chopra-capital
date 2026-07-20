import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getFullSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function contentDisposition(fileName: string, inline: boolean): string {
  const safeName = fileName.replace(/[^\w.\- ]/g, "_");
  const encodedName = encodeURIComponent(fileName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
}

export async function GET(request: Request, context: RouteContext<"/api/ticket-attachment/[id]">) {
  const session = await getFullSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const attachment = await prisma.ticketAttachment.findUnique({
    where: { id },
    include: {
      message: { select: { ticket: { select: { userId: true } } } },
    },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "ADMIN" && attachment.message.ticket.userId !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const uploadsRoot = path.resolve(process.cwd(), "uploads", "tickets");
  const resolved = path.resolve(attachment.filePath);
  if (resolved !== uploadsRoot && !resolved.startsWith(`${uploadsRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(resolved);
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }

  const inline =
    attachment.mimeType.startsWith("image/") ||
    attachment.mimeType.startsWith("video/") ||
    attachment.mimeType === "application/pdf";

  const commonHeaders = {
    "Content-Type": attachment.mimeType,
    "Content-Disposition": contentDisposition(attachment.fileName, inline),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  };

  const range = attachment.mimeType.startsWith("video/") ? request.headers.get("range") : null;
  const match = range?.match(/^bytes=(\d+)-(\d*)$/);
  if (match) {
    const start = Number(match[1]);
    const requestedEnd = match[2] ? Number(match[2]) : bytes.length - 1;
    const end = Math.min(requestedEnd, bytes.length - 1);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${bytes.length}` },
      });
    }
    const chunk = bytes.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...commonHeaders,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
        "Content-Length": String(chunk.length),
      },
    });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      ...commonHeaders,
      "Content-Length": String(bytes.length),
      ...(attachment.mimeType.startsWith("video/") ? { "Accept-Ranges": "bytes" } : {}),
    },
  });
}
