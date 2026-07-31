import {
  assertSameOrigin,
  restoreSystemBackup,
  SystemBackupError,
  verifyAdminBackupAccess,
} from "@/lib/systemBackup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const formData = await request.formData();
    await verifyAdminBackupAccess(formData);
    if (String(formData.get("confirmation") ?? "") !== "RESTORE") {
      throw new SystemBackupError('Type "RESTORE" to confirm this operation.');
    }

    const upload = formData.get("backup");
    if (!(upload instanceof File) || upload.size === 0) {
      throw new SystemBackupError("Choose a Chopra Capital backup file.");
    }

    const result = await restoreSystemBackup(
      Buffer.from(await upload.arrayBuffer()),
    );
    return Response.json({
      success:
        "The database and .env file were restored. Restart the systemd service immediately.",
      ...result,
    });
  } catch (error) {
    const status = error instanceof SystemBackupError ? error.status : 500;
    const message =
      error instanceof SystemBackupError
        ? error.message
        : "The system backup could not be restored.";
    return Response.json({ error: message }, { status });
  }
}