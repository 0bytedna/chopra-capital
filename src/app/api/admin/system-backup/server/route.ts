import {
  assertSameOrigin,
  SystemBackupError,
  verifyAdminBackupAccess,
} from "@/lib/systemBackup";
import { saveSeparateBackupsToServer } from "@/lib/systemFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const formData = await request.formData();
    await verifyAdminBackupAccess(formData);
    const backup = await saveSeparateBackupsToServer("manual");

    return Response.json({
      success: `Server backups saved as ${backup.databaseFilename} and ${backup.environmentFilename}.`,
      backup,
    });
  } catch (error) {
    const status = error instanceof SystemBackupError ? error.status : 500;
    const message =
      error instanceof SystemBackupError
        ? error.message
        : "The separate server backups could not be saved.";
    return Response.json({ error: message }, { status });
  }
}