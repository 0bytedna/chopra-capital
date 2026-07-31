import {
  assertSameOrigin,
  saveSystemBackupToServer,
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
    const backup = await saveSystemBackupToServer("manual");

    return Response.json({
      success: `Server backup saved as ${backup.filename}.`,
      backup,
    });
  } catch (error) {
    const status = error instanceof SystemBackupError ? error.status : 500;
    const message =
      error instanceof SystemBackupError
        ? error.message
        : "The server backup could not be saved.";
    return Response.json({ error: message }, { status });
  }
}
