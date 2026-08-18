import { Buffer } from "node:buffer";
import path from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), false);

const errors = [];
const warnings = [];

const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
if (nodeMajor < 20 || (nodeMajor === 20 && nodeMinor < 19)) {
  errors.push("Node.js 20.19.0 or newer is required for the installed production dependencies.");
}
function required(name, minimumLength = 1) {
  const value = process.env[name]?.trim() ?? "";
  if (value.length < minimumLength) {
    errors.push(`${name} must be set${minimumLength > 1 ? ` and contain at least ${minimumLength} characters` : ""}.`);
  }
  return value;
}

required("DATABASE_URL");
required("AUTH_SECRET", 32);
required("ADMIN_PASSWORD", 12);

const adminEmail = required("ADMIN_EMAIL");
if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  errors.push("ADMIN_EMAIL must be a valid email address.");
}

const appUrl = required("NEXT_PUBLIC_APP_URL");
try {
  const parsed = new URL(appUrl);
  if (parsed.protocol !== "https:") errors.push("NEXT_PUBLIC_APP_URL must use HTTPS in production.");
} catch {
  if (appUrl) errors.push("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
}

required("NEXT_DEPLOYMENT_ID");

const actionKey = required("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY");
if (actionKey) {
  try {
    const decoded = Buffer.from(actionKey, "base64");
    if (![16, 24, 32].includes(decoded.length) || decoded.toString("base64") !== actionKey) {
      errors.push("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be a valid base64-encoded 16, 24, or 32-byte key.");
    }
  } catch {
    errors.push("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be valid base64.");
  }
}

if (process.env.WITHDRAWAL_WINDOW_TEST_MODE?.trim().toLowerCase() === "true") {
  errors.push("WITHDRAWAL_WINDOW_TEST_MODE must not be true in production.");
}

const backupDirectory = process.env.SERVER_BACKUP_DIR?.trim() ?? "";
if (!backupDirectory) {
  warnings.push(
    "SERVER_BACKUP_DIR is empty; one-click and scheduled server backups are disabled.",
  );
} else if (!path.isAbsolute(backupDirectory)) {
  errors.push("SERVER_BACKUP_DIR must be an absolute path.");
}

const backupSecret = process.env.BACKUP_CRON_SECRET?.trim() ?? "";
if (!backupSecret) {
  warnings.push(
    "BACKUP_CRON_SECRET is empty; the midnight systemd backup timer is disabled.",
  );
} else if (backupSecret.length < 32) {
  errors.push("BACKUP_CRON_SECRET must contain at least 32 characters.");
}

const backupRetention = process.env.SERVER_BACKUP_RETENTION?.trim() ?? "";
if (
  backupRetention &&
  (!Number.isSafeInteger(Number(backupRetention)) ||
    Number(backupRetention) < 1 ||
    Number(backupRetention) > 50)
) {
  errors.push("SERVER_BACKUP_RETENTION must be an integer between 1 and 50.");
}

for (const name of ["DEPOSIT_ADDRESS_TRC20", "DEPOSIT_ADDRESS_ERC20", "DEPOSIT_ADDRESS_BEP20"]) {
  if (!process.env[name]?.trim()) warnings.push(`${name} is empty; that deposit network will not have a configured destination.`);
}

if (errors.length) {
  console.error("Production environment check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Production environment check passed.");
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);
