import path from "node:path";
import { cp, lstat, mkdir, readdir, rename, rm } from "node:fs/promises";

const projectRoot = process.cwd();
const uploadsPath = path.join(projectRoot, "uploads");
const projectParent = path.dirname(projectRoot);
const projectName = path.basename(projectRoot);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const stagingPath = path.join(
  projectParent,
  `${projectName}-uploads-localizing-${process.pid}-${timestamp}`,
);
const backupPath = path.join(
  projectParent,
  `${projectName}-uploads-external-backup-${timestamp}`,
);

async function exists(entryPath) {
  try {
    await lstat(entryPath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function containsSymlink(entryPath) {
  const entryStat = await lstat(entryPath);
  if (entryStat.isSymbolicLink()) return true;
  if (!entryStat.isDirectory()) return false;

  const entries = await readdir(entryPath, { withFileTypes: true });
  for (const entry of entries) {
    const childPath = path.join(entryPath, entry.name);
    if (entry.isSymbolicLink() || (entry.isDirectory() && (await containsSymlink(childPath)))) {
      return true;
    }
  }
  return false;
}

async function ensurePrivateUploadDirectories() {
  await Promise.all([
    mkdir(path.join(uploadsPath, "kyc"), { recursive: true }),
    mkdir(path.join(uploadsPath, "tickets"), { recursive: true }),
  ]);
}

if (!(await exists(uploadsPath))) {
  await ensurePrivateUploadDirectories();
  console.log(`Created project-local private uploads at ${uploadsPath}`);
  process.exit(0);
}

if (!(await containsSymlink(uploadsPath))) {
  await ensurePrivateUploadDirectories();
  console.log(`Uploads are already stored locally at ${uploadsPath}`);
  process.exit(0);
}

console.log("Copying linked uploads into a real project-local directory...");

try {
  await cp(uploadsPath, stagingPath, {
    recursive: true,
    dereference: true,
    errorOnExist: true,
    force: false,
    preserveTimestamps: true,
  });

  await rename(uploadsPath, backupPath);
  try {
    await rename(stagingPath, uploadsPath);
  } catch (error) {
    await rename(backupPath, uploadsPath);
    throw error;
  }

  await ensurePrivateUploadDirectories();
  console.log(`Uploads are now stored locally at ${uploadsPath}`);
  console.log(`The previous linked tree was retained at ${backupPath}`);
} catch (error) {
  await rm(stagingPath, { recursive: true, force: true });
  throw error;
}
