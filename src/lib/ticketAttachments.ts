import "server-only";

import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";

export const MAX_TICKET_ATTACHMENTS = 5;
export const MAX_TICKET_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_TICKET_ATTACHMENTS_TOTAL_BYTES = 40 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Map<string, string>([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".mov", "video/quicktime"],
  [".pdf", "application/pdf"],
  [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".xls", "application/vnd.ms-excel"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".csv", "text/csv"],
  [".txt", "text/plain"],
]);

export type StoredTicketAttachment = {
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
};

type ValidatedFile = {
  bytes: Buffer;
  extension: string;
  mimeType: string;
  originalName: string;
};

export function ticketFilesFrom(formData: FormData): File[] {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function startsWith(bytes: Buffer, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function hasAsciiAt(bytes: Buffer, value: string, offset: number): boolean {
  return bytes.subarray(offset, offset + value.length).toString("ascii") === value;
}

function validSignature(extension: string, bytes: Buffer): boolean {
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case ".png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case ".gif":
      return hasAsciiAt(bytes, "GIF87a", 0) || hasAsciiAt(bytes, "GIF89a", 0);
    case ".webp":
      return hasAsciiAt(bytes, "RIFF", 0) && hasAsciiAt(bytes, "WEBP", 8);
    case ".mp4":
    case ".mov":
      return hasAsciiAt(bytes, "ftyp", 4);
    case ".webm":
      return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
    case ".pdf": {
      const text = bytes.toString("latin1");
      return text.startsWith("%PDF-") && /%%EOF\s*$/.test(text);
    }
    case ".doc":
    case ".xls":
      return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case ".docx":
      return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && bytes.includes(Buffer.from("word/"));
    case ".xlsx":
      return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && bytes.includes(Buffer.from("xl/"));
    case ".csv":
    case ".txt":
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return !text.includes("\u0000");
      } catch {
        return false;
      }
    default:
      return false;
  }
}

async function sanitizeImage(extension: string, bytes: Buffer): Promise<Buffer> {
  const image = sharp(bytes, { animated: true, failOn: "error", limitInputPixels: 40_000_000 });
  if (extension === ".jpg" || extension === ".jpeg") return image.jpeg({ quality: 90 }).toBuffer();
  if (extension === ".png") return image.png().toBuffer();
  if (extension === ".webp") return image.webp({ quality: 90 }).toBuffer();
  return image.gif().toBuffer();
}

async function validateTicketFiles(files: File[]): Promise<ValidatedFile[]> {
  if (files.length > MAX_TICKET_ATTACHMENTS) {
    throw new Error(`Attach up to ${MAX_TICKET_ATTACHMENTS} files per message.`);
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_TICKET_ATTACHMENTS_TOTAL_BYTES) {
    throw new Error("Attachments must be 40 MB or less in total.");
  }

  const validated: ValidatedFile[] = [];
  for (const file of files) {
    const originalName = path.basename(file.name).slice(0, 180) || "attachment";
    const extension = path.extname(originalName).toLowerCase();
    const mimeType = ALLOWED_FILE_TYPES.get(extension);
    if (!mimeType) {
      throw new Error(
        "Supported files: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, PDF, DOC, DOCX, XLS, XLSX, CSV and TXT.",
      );
    }
    if (file.size > MAX_TICKET_ATTACHMENT_BYTES) {
      throw new Error(`${originalName} is larger than the 25 MB per-file limit.`);
    }
    const input: Buffer = Buffer.from(await file.arrayBuffer());
    if (!validSignature(extension, input)) {
      throw new Error(`${originalName} does not match its file type or is malformed.`);
    }

    let bytes: Buffer = input;
    if (mimeType.startsWith("image/")) {
      try {
        // Decoding and re-encoding strips appended polyglot/script content and
        // rejects malformed images before anything reaches persistent storage.
        bytes = await sanitizeImage(extension, input);
      } catch {
        throw new Error(`${originalName} is not a valid supported image.`);
      }
    }
    validated.push({ bytes, extension, mimeType, originalName });
  }

  const sanitizedTotal = validated.reduce((total, item) => total + item.bytes.length, 0);
  if (sanitizedTotal > MAX_TICKET_ATTACHMENTS_TOTAL_BYTES) {
    throw new Error("Attachments must be 40 MB or less in total.");
  }
  return validated;
}

export async function storeTicketAttachments(
  ticketId: string,
  messageId: string,
  files: File[],
): Promise<StoredTicketAttachment[]> {
  const validated = await validateTicketFiles(files);
  if (validated.length === 0) return [];

  const directory = path.join(process.cwd(), "uploads", "tickets", ticketId, messageId);
  await mkdir(directory, { recursive: true });
  const stored: StoredTicketAttachment[] = [];

  try {
    for (const item of validated) {
      const filePath = path.join(directory, `${randomUUID()}${item.extension}`);
      await writeFile(filePath, item.bytes, { flag: "wx" });
      stored.push({
        fileName: item.originalName,
        filePath,
        mimeType: item.mimeType,
        size: item.bytes.length,
      });
    }
    return stored;
  } catch (error) {
    await removeStoredTicketAttachments(stored);
    throw error;
  }
}

export async function removeStoredTicketAttachments(
  attachments: StoredTicketAttachment[],
): Promise<void> {
  await Promise.allSettled(attachments.map((attachment) => unlink(attachment.filePath)));
}
