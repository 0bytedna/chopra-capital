import {
  assertSameOrigin,
  createSystemBackup,
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
    const backup = await createSystemBackup();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    return new Response(new Uint8Array(backup), {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": `attachment; filename="chopra-capital-${timestamp}.ccbackup"`,
        "Content-Type": "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof SystemBackupError ? error.status : 500;
    const message =
      error instanceof SystemBackupError
        ? error.message
        : "The system backup could not be created.";
    return Response.json({ error: message }, { status });
  }
}