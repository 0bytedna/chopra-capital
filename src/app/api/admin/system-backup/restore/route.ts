import {
  assertSameOrigin,
  SystemBackupError,
  verifyAdminBackupAccess,
} from "@/lib/systemBackup";
import {
  restoreDatabaseFile,
  restoreEnvironmentFile,
} from "@/lib/systemFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const formData = await request.formData();
    await verifyAdminBackupAccess(formData);
    const target = String(formData.get("target") ?? "");
    const expectedConfirmation =
      target === "database"
        ? "RESTORE DATABASE"
        : target === "environment"
          ? "RESTORE ENV"
          : null;

    if (!expectedConfirmation) {
      throw new SystemBackupError("Choose database or environment file to restore.");
    }
    if (String(formData.get("confirmation") ?? "") !== expectedConfirmation) {
      throw new SystemBackupError(
        `Type "${expectedConfirmation}" to confirm this operation.`,
      );
    }

    const upload = formData.get("backup");
    if (!(upload instanceof File) || upload.size === 0) {
      throw new SystemBackupError(
        target === "database" ? "Choose a production.db file." : "Choose a .env file.",
      );
    }

    const uploaded = Buffer.from(await upload.arrayBuffer());
    const result =
      target === "database"
        ? await restoreDatabaseFile(uploaded)
        : await restoreEnvironmentFile(uploaded);

    return Response.json({
      success:
        target === "database"
          ? "The production database was restored. Restart the systemd service immediately."
          : "The .env file was restored. Restart the systemd service immediately.",
      ...result,
    });
  } catch (error) {
    const status = error instanceof SystemBackupError ? error.status : 500;
    const message =
      error instanceof SystemBackupError
        ? error.message
        : "The requested file could not be restored.";
    return Response.json({ error: message }, { status });
  }
}