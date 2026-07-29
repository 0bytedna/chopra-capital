import "server-only";

import { open } from "node:fs/promises";

export async function readRuntimeFile(filePath: string): Promise<Buffer> {
  const file = await open(filePath, "r");
  try {
    return await file.readFile();
  } finally {
    await file.close();
  }
}
