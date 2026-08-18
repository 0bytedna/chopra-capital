import { timingSafeEqual } from "node:crypto";
import { saveSeparateBackupsToServer } from "@/lib/systemFiles";
import { SystemBackupError } from "@/lib/systemBackup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyScheduler(request: Request): void {
  const expected = process.env.BACKUP_CRON_SECRET?.trim() ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (expected.length < 32 || supplied.length !== expected.length) {
    throw new SystemBackupError("Scheduled backup authentication failed.", 401);
  }
  if (
    !timingSafeEqual(
      Buffer.from(supplied, "utf8"),
      Buffer.from(expected, "utf8"),
    )
  ) {
    throw new SystemBackupError("Scheduled backup authentication failed.", 401);
  }
}

export async function POST(request: Request) {
  try {
    verifyScheduler(request);
    const backup = await saveSeparateBackupsToServer("scheduled");
    return Response.json({ success: true, backup });
  } catch (error) {
    const status = error instanceof SystemBackupError ? error.status : 500;
    const message =
      error instanceof SystemBackupError
        ? error.message
        : "The scheduled backup could not be saved.";
    return Response.json({ error: message }, { status });
  }
}