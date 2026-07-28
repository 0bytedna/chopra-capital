import "server-only";

import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";

export const MAX_KYC_FILE_BYTES = 8 * 1024 * 1024;

const KYC_FILE_TYPES = new Map<string, string>([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".pdf", "application/pdf"],
]);

export type StoredKycFile = {
  docType: "AADHAAR" | "PAN";
  fileName: string;
  filePath: string;
};

function hasExpectedSignature(extension: string, bytes: Buffer): boolean {
  if (extension === ".jpg" || extension === ".jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === ".png") {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (extension === ".webp") {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (extension === ".pdf") {
    return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  return false;
}

async function validateKycFile(
  file: File,
  docType: StoredKycFile["docType"],
): Promise<{ extension: string; originalName: string; bytes: Buffer; docType: StoredKycFile["docType"] }> {
  const originalName = path.basename(file.name).slice(0, 180) || `${docType.toLowerCase()}-document`;
  const extension = path.extname(originalName).toLowerCase();

  if (!KYC_FILE_TYPES.has(extension)) {
    throw new Error("Only JPG, PNG, WEBP or PDF files are accepted.");
  }
  if (file.size === 0) throw new Error("File is empty.");
  if (file.size > MAX_KYC_FILE_BYTES) throw new Error("Files must be under 8 MB.");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasExpectedSignature(extension, bytes)) {
    throw new Error(`${originalName} does not match its file type.`);
  }

  return { extension, originalName, bytes, docType };
}

export async function storeKycFiles(
  userId: string,
  documents: Array<{ file: File; docType: StoredKycFile["docType"] }>,
): Promise<StoredKycFile[]> {
  const validated = await Promise.all(
    documents.map(({ file, docType }) => validateKycFile(file, docType)),
  );
  const directory = path.join(process.cwd(), "uploads", "kyc", userId);
  await mkdir(directory, { recursive: true });
  const stored: StoredKycFile[] = [];

  try {
    for (const item of validated) {
      const filePath = path.join(directory, `${item.docType.toLowerCase()}-${randomUUID()}${item.extension}`);
      await writeFile(filePath, item.bytes, { flag: "wx" });
      stored.push({
        docType: item.docType,
        fileName: item.originalName,
        filePath,
      });
    }
    return stored;
  } catch (error) {
    await removeStoredKycFiles(stored);
    throw error;
  }
}

export async function removeStoredKycFiles(files: StoredKycFile[]): Promise<void> {
  await Promise.allSettled(files.map((file) => unlink(file.filePath)));
}
