import "server-only";

import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";

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
  file: File;
  extension: string;
  mimeType: string;
  originalName: string;
};

export function ticketFilesFrom(formData: FormData): File[] {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function validateTicketFiles(files: File[]): ValidatedFile[] {
  if (files.length > MAX_TICKET_ATTACHMENTS) {
    throw new Error(`Attach up to ${MAX_TICKET_ATTACHMENTS} files per message.`);
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_TICKET_ATTACHMENTS_TOTAL_BYTES) {
    throw new Error("Attachments must be 40 MB or less in total.");
  }

  return files.map((file) => {
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
    return { file, extension, mimeType, originalName };
  });
}

export async function storeTicketAttachments(
  ticketId: string,
  messageId: string,
  files: File[],
): Promise<StoredTicketAttachment[]> {
  const validated = validateTicketFiles(files);
  if (validated.length === 0) return [];

  const directory = path.join(process.cwd(), "uploads", "tickets", ticketId, messageId);
  await mkdir(directory, { recursive: true });
  const stored: StoredTicketAttachment[] = [];

  try {
    for (const item of validated) {
      const filePath = path.join(directory, `${randomUUID()}${item.extension}`);
      await writeFile(filePath, Buffer.from(await item.file.arrayBuffer()), { flag: "wx" });
      stored.push({
        fileName: item.originalName,
        filePath,
        mimeType: item.mimeType,
        size: item.file.size,
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
