import {
  assertSameOrigin,
  SystemBackupError,
  verifyAdminBackupAccess,
} from "@/lib/systemBackup";
import {
  createDatabaseBackupFile,
  createEnvironmentBackupFile,
} from "@/lib/systemFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const formData = await request.formData();
    await verifyAdminBackupAccess(formData);
    const target = String(formData.get("target") ?? "");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    let backup: Buffer;
    let filename: string;
    let contentType: string;
    if (target === "database") {
      backup = await createDatabaseBackupFile();
      filename = `chopra-capital-${timestamp}-production.db`;
      contentType = "application/vnd.sqlite3";
    } else if (target === "environment") {
      backup = await createEnvironmentBackupFile();
      filename = `chopra-capital-${timestamp}.env`;
      contentType = "text/plain; charset=utf-8";
    } else {
      throw new SystemBackupError("Choose database or environment file to download.");
    }

    return new Response(new Uint8Array(backup), {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof SystemBackupError ? error.status : 500;
    const message =
      error instanceof SystemBackupError
        ? error.message
        : "The requested backup file could not be created.";
    return Response.json({ error: message }, { status });
  }
}