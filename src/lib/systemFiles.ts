import "server-only";

import { randomUUID } from "node:crypto";
import {
  access,
  chmod,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { SystemBackupError } from "@/lib/systemBackup";

const MAX_DATABASE_BYTES = 250 * 1024 * 1024;
const MAX_ENV_BYTES = 1024 * 1024;
const DEFAULT_SERVER_BACKUP_RETENTION = 50;
const MAX_SERVER_BACKUP_RETENTION = 50;

export type SeparateServerBackup = {
  createdAt: string;
  databaseFilename: string;
  environmentFilename: string;
  pruned: number;
  size: number;
};

function projectPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

function environmentPath(): string {
  return projectPath(".env");
}

function databasePath(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw?.startsWith("file:")) {
    throw new SystemBackupError(
      "DATABASE_URL must point to the production SQLite database.",
      500,
    );
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
      "File backup is available only when DATABASE_URL targets production.db.",
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

function validateDatabase(data: Buffer): void {
  if (data.length === 0 || data.length > MAX_DATABASE_BYTES) {
    throw new SystemBackupError("The production.db backup size is invalid.");
  }
  if (!data.subarray(0, 16).equals(Buffer.from("SQLite format 3\0"))) {
    throw new SystemBackupError("The selected file is not a valid SQLite database.");
  }
}

function decodeEnvironment(data: Buffer): string {
  if (data.length === 0 || data.length > MAX_ENV_BYTES) {
    throw new SystemBackupError("The .env backup size is invalid.");
  }

  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    throw new SystemBackupError("The selected .env file is not valid UTF-8 text.");
  }

  if (
    content.includes("\0") ||
    !/^\s*DATABASE_URL\s*=/m.test(content) ||
    !/^\s*AUTH_SECRET\s*=/m.test(content)
  ) {
    throw new SystemBackupError(
      "The .env file must contain DATABASE_URL and AUTH_SECRET.",
    );
  }
  return content;
}

export async function createDatabaseBackupFile(): Promise<Buffer> {
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
    validateDatabase(data);
    return data;
  } finally {
    await rm(snapshotPath, { force: true }).catch(() => undefined);
  }
}

export async function createEnvironmentBackupFile(): Promise<Buffer> {
  const liveEnvironmentPath = environmentPath();
  await requireRegularFile(liveEnvironmentPath, ".env");
  const data = await readFile(liveEnvironmentPath);
  decodeEnvironment(data);
  return data;
}

export async function readEnvironmentText(): Promise<string> {
  return decodeEnvironment(await createEnvironmentBackupFile());
}

export async function restoreDatabaseFile(
  uploaded: Buffer,
): Promise<{ restoredAt: string; rollbackFilename: string }> {
  validateDatabase(uploaded);
  const livePath = databasePath();
  await requireRegularFile(livePath, "production.db");

  const restoredAt = new Date().toISOString();
  const suffix = `.before-restore-${restoredAt.replace(/[:.]/g, "-")}`;
  const rollbackPath = `${livePath}${suffix}`;
  const tempPath = `${livePath}.restore-${randomUUID()}`;
  const walPath = `${livePath}-wal`;
  const shmPath = `${livePath}-shm`;
  await writeDurably(tempPath, uploaded);

  let moved = false;
  try {
    await prisma.$disconnect();
    await rename(livePath, rollbackPath);
    moved = true;
    if (await exists(walPath)) await rename(walPath, `${rollbackPath}-wal`);
    if (await exists(shmPath)) await rename(shmPath, `${rollbackPath}-shm`);
    await rename(tempPath, livePath);
    await Promise.all([chmod(livePath, 0o600), chmod(rollbackPath, 0o600)]);
    return { restoredAt, rollbackFilename: path.basename(rollbackPath) };
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    if (moved && !(await exists(livePath))) {
      await rename(rollbackPath, livePath).catch(() => undefined);
    }
    throw error;
  }
}

async function replaceEnvironment(
  uploaded: Buffer,
  operation: "restore" | "edit",
): Promise<{ updatedAt: string; rollbackFilename: string }> {
  decodeEnvironment(uploaded);
  const livePath = environmentPath();
  await requireRegularFile(livePath, ".env");

  const updatedAt = new Date().toISOString();
  const suffix = `.before-${operation}-${updatedAt.replace(/[:.]/g, "-")}`;
  const rollbackPath = `${livePath}${suffix}`;
  const tempPath = `${livePath}.${operation}-${randomUUID()}`;
  await writeDurably(tempPath, uploaded);

  let moved = false;
  try {
    await rename(livePath, rollbackPath);
    moved = true;
    await rename(tempPath, livePath);
    await Promise.all([chmod(livePath, 0o600), chmod(rollbackPath, 0o600)]);
    return { updatedAt, rollbackFilename: path.basename(rollbackPath) };
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    if (moved && !(await exists(livePath))) {
      await rename(rollbackPath, livePath).catch(() => undefined);
    }
    throw error;
  }
}

export function restoreEnvironmentFile(uploaded: Buffer) {
  return replaceEnvironment(uploaded, "restore");
}

export function updateEnvironmentText(content: string) {
  return replaceEnvironment(Buffer.from(content, "utf8"), "edit");
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

async function pruneSeparateBackups(directory: string, keep: number): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = new Map<string, { files: string[]; modifiedAt: number }>();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = /^(chopra-capital-.+-(?:manual|scheduled)-[a-f0-9]{8})-(?:production\.db|environment\.env)$/.exec(
      entry.name,
    );
    if (!match) continue;
    const base = match[1];
    const modifiedAt = (await stat(path.join(directory, entry.name))).mtimeMs;
    const group = groups.get(base) ?? { files: [], modifiedAt: 0 };
    group.files.push(entry.name);
    group.modifiedAt = Math.max(group.modifiedAt, modifiedAt);
    groups.set(base, group);
  }

  const oldGroups = [...groups.values()]
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
    .slice(keep);
  for (const group of oldGroups) {
    await Promise.all(
      group.files.map((filename) =>
        rm(path.join(directory, filename), { force: true }),
      ),
    );
  }
  return oldGroups.length;
}

export async function saveSeparateBackupsToServer(
  source: "manual" | "scheduled",
): Promise<SeparateServerBackup> {
  const directory = await ensureServerBackupDirectory();
  const [database, environment] = await Promise.all([
    createDatabaseBackupFile(),
    createEnvironmentBackupFile(),
  ]);
  const createdAt = new Date().toISOString();
  const timestamp = createdAt.replace(/[:.]/g, "-");
  const token = randomUUID().replaceAll("-", "").slice(0, 8);
  const base = `chopra-capital-${timestamp}-${source}-${token}`;
  const databaseFilename = `${base}-production.db`;
  const environmentFilename = `${base}-environment.env`;
  const databaseDestination = path.join(directory, databaseFilename);
  const environmentDestination = path.join(directory, environmentFilename);

  try {
    await writeDurably(databaseDestination, database);
    await writeDurably(environmentDestination, environment);
    await Promise.all([
      chmod(databaseDestination, 0o600),
      chmod(environmentDestination, 0o600),
    ]);
  } catch (error) {
    await Promise.all([
      rm(databaseDestination, { force: true }).catch(() => undefined),
      rm(environmentDestination, { force: true }).catch(() => undefined),
    ]);
    throw error;
  }

  const pruned = await pruneSeparateBackups(
    directory,
    serverBackupRetention(),
  );
  return {
    createdAt,
    databaseFilename,
    environmentFilename,
    pruned,
    size: database.length + environment.length,
  };
}
