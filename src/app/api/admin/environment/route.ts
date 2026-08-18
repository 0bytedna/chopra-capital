import {
  readEnvironmentText,
  updateEnvironmentText,
} from "@/lib/systemFiles";
import {
  assertSameOrigin,
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
    const action = String(formData.get("action") ?? "");

    if (action === "read") {
      return Response.json(
        { content: await readEnvironmentText() },
        { headers: { "Cache-Control": "private, no-store, max-age=0" } },
      );
    }
    if (action === "save") {
      if (String(formData.get("confirmation") ?? "") !== "SAVE ENV") {
        throw new SystemBackupError("Environment save confirmation is missing.");
      }
      const result = await updateEnvironmentText(
        String(formData.get("content") ?? ""),
      );
      return Response.json({
        success: "The .env file was saved. Restart the systemd service to apply it.",
        ...result,
      });
    }

    throw new SystemBackupError("Choose a valid environment-file action.");
  } catch (error) {
    const status = error instanceof SystemBackupError ? error.status : 500;
    const message =
      error instanceof SystemBackupError
        ? error.message
        : "The environment file could not be processed.";
    return Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
