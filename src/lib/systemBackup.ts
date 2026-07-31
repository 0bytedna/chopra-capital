import "server-only";

import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import {
  access,
  chmod,
  open,
  readFile,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { getFullSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";

const BACKUP_FORMAT = "chopra-capital-system-backup";
const BACKUP_VERSION = 1;
const MAX_DATABASE_BYTES = 250 * 1024 * 1024;
const MAX_ENV_BYTES = 1024 * 1024;
const MAX_BACKUP_BYTES = 300 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 350 * 1024 * 1024;
const DEFAULT_SERVER_BACKUP_RETENTION = 30;
const MAX_SERVER_BACKUP_RETENTION = 365;

type BackupFile = {
  data: string;
  sha256: string;
  size: number;
};

type BackupBundle = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  files: {
    "production.db": BackupFile;
    ".env": BackupFile;
  };
};

export type StoredSystemBackup = {
  createdAt: string;
  filename: string;
  pruned: number;
  size: number;
};

export class SystemBackupError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function projectPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

function environmentPath(): string {
  return projectPath(".env");
}

function databasePath(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw?.startsWith("file:")) {
    throw new SystemBackupError("DATABASE_URL must point to the production SQLite database.", 500);
  }

  const withoutQuery = decodeURIComponent(raw.slice(5).split("?")[0] ?? "");
  const normalized = withoutQuery.replaceAll("/", path.sep);
  const candidates = path.isAbsolute(normalized)
    ? [normalized]
    : [
        path.resolve(process.cwd(), "prisma", normalized),
        path.resolve(process.cwd(), normalized),
      ];

  const selected =
    candidates.find((candidate) => path.basename(candidate) === "production.db") ??
    candidates[0];

  if (path.basename(selected) !== "production.db") {
    throw new SystemBackupError(
      "System backup is available only when DATABASE_URL targets production.db.",
      500,
    );
  }

  return selected;
}

async function requireRegularFile(filePath: string, label: string): Promise<void> {
  const details = await stat(filePath).catch(() => null);
  if (!details?.isFile()) {
    throw new SystemBackupError(`${label} was not found on this server.`, 500);
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) {
    throw new SystemBackupError("The request origin could not be verified.", 403);
  }

  try {
    if (new URL(origin).host !== host) {
      throw new SystemBackupError("Cross-origin backup requests are blocked.", 403);
    }
  } catch (error) {
    if (error instanceof SystemBackupError) throw error;
    throw new SystemBackupError("The request origin could not be verified.", 403);
  }
}

export async function verifyAdminBackupAccess(formData: FormData): Promise<void> {
  const session = await getFullSession();
  if (!session || session.role !== "ADMIN") {
    throw new SystemBackupError("Administrator authentication is required.", 401);
  }

  const admin = await prisma.user.findFirst({
    where: { id: session.sub, role: "ADMIN" },
    select: {
      passwordHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const passwordValid =
    admin !== null &&
    password.length > 0 &&
    (await bcrypt.compare(password, admin.passwordHash));
  const twoFactorValid =
    admin !== null &&
    (!admin.twoFactorEnabled ||
      (admin.twoFactorSecret !== null &&
        /^\d{6}$/.test(code) &&
        (await verifyTotp(code, admin.twoFactorSecret))));

  if (!passwordValid || !twoFactorValid) {
    throw new SystemBackupError(
      "The password or authenticator code is incorrect.",
      403,
    );
  }
}

async function snapshotDatabase(): Promise<{ data: Buffer; cleanup: () => Promise<void> }> {
  const liveDatabasePath = databasePath();
  await requireRegularFile(liveDatabasePath, "production.db");

  const snapshotPath = path.join(
    path.dirname(liveDatabasePath),
    `.backup-${randomUUID()}.db`,
  );
  const sqlPath = snapshotPath.replaceAll("\\", "/").replaceAll("'", "''");

  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlPath}'`);
    const data = await readFile(snapshotPath);
    if (data.length === 0 || data.length > MAX_DATABASE_BYTES) {
      throw new SystemBackupError("The production database size is invalid.", 500);
    }
    return {
      data,
      cleanup: () => rm(snapshotPath, { force: true }),
    };
  } catch (error) {
    await rm(snapshotPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function encodedFile(data: Buffer): BackupFile {
  return {
    data: data.toString("base64"),
    sha256: sha256(data),
    size: data.length,
  };
}

export async function createSystemBackup(): Promise<Buffer> {
  const envPath = environmentPath();
  await requireRegularFile(envPath, ".env");
  const envData = await readFile(envPath);
  if (envData.length === 0 || envData.length > MAX_ENV_BYTES) {
    throw new SystemBackupError("The .env file size is invalid.", 500);
  }

  const snapshot = await snapshotDatabase();
  try {
    const bundle: BackupBundle = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      files: {
        "production.db": encodedFile(snapshot.data),
        ".env": encodedFile(envData),
      },
    };
    return gzipSync(Buffer.from(JSON.stringify(bundle)), { level: 9 });
  } finally {
    await snapshot.cleanup();
  }
}

function serverBackupDirectory(): string {
  const configured = process.env.SERVER_BACKUP_DIR?.trim();
  if (!configured) {
    throw new SystemBackupError(
      "SERVER_BACKUP_DIR is not configured on this server.",
      503,
    );
  }
  if (!path.isAbsolute(configured)) {
    throw new SystemBackupError("SERVER_BACKUP_DIR must be an absolute path.", 500);
  }

  const resolved = path.resolve(configured);
  const relativeToProject = path.relative(process.cwd(), resolved);
  if (
    relativeToProject === "" ||
    (!relativeToProject.startsWith(`..${path.sep}`) &&
      relativeToProject !== ".." &&
      !path.isAbsolute(relativeToProject))
  ) {
    throw new SystemBackupError(
      "SERVER_BACKUP_DIR must be outside the website directory.",
      500,
    );
  }
  return resolved;
}

function serverBackupRetention(): number {
  const raw = process.env.SERVER_BACKUP_RETENTION?.trim();
  if (!raw) return DEFAULT_SERVER_BACKUP_RETENTION;
  const retention = Number(raw);
  if (
    !Number.isSafeInteger(retention) ||
    retention < 1 ||
    retention > MAX_SERVER_BACKUP_RETENTION
  ) {
    throw new SystemBackupError(
      `SERVER_BACKUP_RETENTION must be between 1 and ${MAX_SERVER_BACKUP_RETENTION}.`,
      500,
    );
  }
  return retention;
}

async function ensureServerBackupDirectory(): Promise<string> {
  const directory = serverBackupDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const details = await lstat(directory);
  if (!details.isDirectory() || details.isSymbolicLink()) {
    throw new SystemBackupError(
      "SERVER_BACKUP_DIR must be a real directory, not a symbolic link.",
      500,
    );
  }
  await chmod(directory, 0o700);
  return directory;
}

async function pruneServerBackups(
  directory: string,
  keep: number,
): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true });
  const backups = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          /^chopra-capital-.+-(manual|scheduled)-[a-f0-9]{8}\.ccbackup$/.test(
            entry.name,
          ),
      )
      .map(async (entry) => ({
        name: entry.name,
        modifiedAt: (await stat(path.join(directory, entry.name))).mtimeMs,
      })),
  );
  backups.sort((left, right) => right.modifiedAt - left.modifiedAt);

  let pruned = 0;
  for (const backup of backups.slice(keep)) {
    await rm(path.join(directory, backup.name), { force: true });
    pruned += 1;
  }
  return pruned;
}

export async function saveSystemBackupToServer(
  source: "manual" | "scheduled",
): Promise<StoredSystemBackup> {
  const directory = await ensureServerBackupDirectory();
  const backup = await createSystemBackup();
  const createdAt = new Date().toISOString();
  const timestamp = createdAt.replace(/[:.]/g, "-");
  const token = randomUUID().replaceAll("-", "").slice(0, 8);
  const filename = `chopra-capital-${timestamp}-${source}-${token}.ccbackup`;
  const destination = path.join(directory, filename);

  await writeDurably(destination, backup);
  await chmod(destination, 0o600);
  const pruned = await pruneServerBackups(
    directory,
    serverBackupRetention(),
  ).catch(() => 0);

  return {
    createdAt,
    filename,
    pruned,
    size: backup.length,
  };
}

function parseFile(value: unknown, name: string, maxBytes: number): Buffer {
  if (!value || typeof value !== "object") {
    throw new SystemBackupError(`The ${name} backup entry is missing.`);
  }
  const entry = value as Partial<BackupFile>;
  if (
    typeof entry.data !== "string" ||
    typeof entry.sha256 !== "string" ||
    typeof entry.size !== "number"
  ) {
    throw new SystemBackupError(`The ${name} backup entry is invalid.`);
  }

  const data = Buffer.from(entry.data, "base64");
  if (data.length === 0 || data.length > maxBytes || data.length !== entry.size) {
    throw new SystemBackupError(`The ${name} backup size is invalid.`);
  }
  if (sha256(data) !== entry.sha256) {
    throw new SystemBackupError(`The ${name} backup checksum is invalid.`);
  }
  return data;
}

function parseBackup(buffer: Buffer): { database: Buffer; environment: Buffer } {
  if (buffer.length === 0 || buffer.length > MAX_BACKUP_BYTES) {
    throw new SystemBackupError("The uploaded backup file is too large or empty.");
  }

  let expanded: Buffer;
  try {
    expanded = gunzipSync(buffer, { maxOutputLength: MAX_EXPANDED_BYTES });
  } catch {
    throw new SystemBackupError("The uploaded file is not a valid Chopra Capital backup.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(expanded.toString("utf8"));
  } catch {
    throw new SystemBackupError("The backup manifest could not be read.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new SystemBackupError("The backup manifest is invalid.");
  }
  const bundle = parsed as Partial<BackupBundle>;
  if (bundle.format !== BACKUP_FORMAT || bundle.version !== BACKUP_VERSION) {
    throw new SystemBackupError("This backup format or version is not supported.");
  }

  const database = parseFile(
    bundle.files?.["production.db"],
    "production.db",
    MAX_DATABASE_BYTES,
  );
  const environment = parseFile(bundle.files?.[".env"], ".env", MAX_ENV_BYTES);
  if (!database.subarray(0, 16).equals(Buffer.from("SQLite format 3\0"))) {
    throw new SystemBackupError("The database entry is not a valid SQLite database.");
  }

  let environmentText: string;
  try {
    environmentText = new TextDecoder("utf-8", { fatal: true }).decode(environment);
  } catch {
    throw new SystemBackupError("The .env entry is not valid UTF-8 text.");
  }
  if (
    environmentText.includes("\0") ||
    !/^\s*DATABASE_URL\s*=/m.test(environmentText) ||
    !/^\s*AUTH_SECRET\s*=/m.test(environmentText)
  ) {
    throw new SystemBackupError("The .env entry is missing required production settings.");
  }

  return { database, environment };
}

async function writeDurably(filePath: string, data: Buffer): Promise<void> {
  const handle = await open(filePath, "wx", 0o600);
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function exists(filePath: string): Promise<boolean> {
  return access(filePath).then(
    () => true,
    () => false,
  );
}

export async function restoreSystemBackup(
  uploaded: Buffer,
): Promise<{ restoredAt: string; rollbackSuffix: string }> {
  const { database, environment } = parseBackup(uploaded);
  const liveDatabasePath = databasePath();
  const liveEnvironmentPath = environmentPath();
  await requireRegularFile(liveDatabasePath, "production.db");
  await requireRegularFile(liveEnvironmentPath, ".env");

  const token = randomUUID();
  const restoredAt = new Date().toISOString();
  const rollbackSuffix = `.before-restore-${restoredAt.replace(/[:.]/g, "-")}`;
  const databaseTemp = `${liveDatabasePath}.restore-${token}`;
  const environmentTemp = `${liveEnvironmentPath}.restore-${token}`;
  const databaseRollback = `${liveDatabasePath}${rollbackSuffix}`;
  const environmentRollback = `${liveEnvironmentPath}${rollbackSuffix}`;
  const walPath = `${liveDatabasePath}-wal`;
  const shmPath = `${liveDatabasePath}-shm`;

  await writeDurably(databaseTemp, database);
  await writeDurably(environmentTemp, environment);

  let environmentMoved = false;
  let databaseMoved = false;
  try {
    await prisma.$disconnect();
    await rename(liveEnvironmentPath, environmentRollback);
    environmentMoved = true;
    await rename(liveDatabasePath, databaseRollback);
    databaseMoved = true;

    if (await exists(walPath)) {
      await rename(walPath, `${databaseRollback}-wal`);
    }
    if (await exists(shmPath)) {
      await rename(shmPath, `${databaseRollback}-shm`);
    }

    await rename(environmentTemp, liveEnvironmentPath);
    await rename(databaseTemp, liveDatabasePath);
    await Promise.all([
      chmod(liveEnvironmentPath, 0o600),
      chmod(liveDatabasePath, 0o600),
      chmod(environmentRollback, 0o600),
      chmod(databaseRollback, 0o600),
    ]);
    return { restoredAt, rollbackSuffix };
  } catch (error) {
    await rm(databaseTemp, { force: true }).catch(() => undefined);
    await rm(environmentTemp, { force: true }).catch(() => undefined);
    if (databaseMoved && !(await exists(liveDatabasePath))) {
      await rename(databaseRollback, liveDatabasePath).catch(() => undefined);
    }
    if (environmentMoved && !(await exists(liveEnvironmentPath))) {
      await rename(environmentRollback, liveEnvironmentPath).catch(() => undefined);
    }
    throw error;
  }
}