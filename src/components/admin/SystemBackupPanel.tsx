"use client";

import { useRef, useState } from "react";
import {
  DatabaseBackup,
  Download,
  FileKey,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { OtpField } from "@/components/ui/OtpField";

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass =
  "text-xs font-semibold uppercase tracking-[0.12em] text-ink-dim";

export function SystemBackupPanel({
  twoFactorEnabled,
}: {
  twoFactorEnabled: boolean;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [pending, setPending] = useState<
    "backup" | "server" | "restore" | null
  >(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function credentials(): FormData {
    const formData = new FormData();
    formData.set("password", password);
    if (twoFactorEnabled) formData.set("code", code);
    return formData;
  }

  async function downloadBackup() {
    setPending("backup");
    setNotice(null);
    try {
      const response = await fetch("/api/admin/system-backup", {
        method: "POST",
        credentials: "same-origin",
        body: credentials(),
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Backup failed.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename =
        /filename="([^"]+)"/.exec(disposition)?.[1] ??
        `chopra-capital-${new Date().toISOString()}.ccbackup`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setCode("");
      setNotice({
        kind: "success",
        message: "Backup downloaded. Store it securely because it contains server secrets.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Backup failed.",
      });
    } finally {
      setPending(null);
    }
  }

  async function restoreBackup() {
    if (!restoreFile) {
      setNotice({ kind: "error", message: "Choose a backup file first." });
      return;
    }
    setPending("restore");
    setNotice(null);
    try {
      const formData = credentials();
      formData.set("confirmation", confirmation);
      formData.set("backup", restoreFile);
      const response = await fetch("/api/admin/system-backup/restore", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const result = (await response.json()) as {
        error?: string;
        success?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Restore failed.");

      setCode("");
      setConfirmation("");
      setRestoreFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setNotice({
        kind: "success",
        message:
          result.success ??
          "Restore completed. Restart the systemd service immediately.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Restore failed.",
      });
    } finally {
      setPending(null);
    }
  }

  async function saveServerBackup() {
    setPending("server");
    setNotice(null);
    try {
      const response = await fetch("/api/admin/system-backup/server", {
        method: "POST",
        credentials: "same-origin",
        body: credentials(),
      });
      const result = (await response.json()) as {
        error?: string;
        success?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Server backup failed.");
      }
      setCode("");
      setNotice({
        kind: "success",
        message: result.success ?? "Backup saved securely on the server.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Server backup failed.",
      });
    } finally {
      setPending(null);
    }
  }

  const credentialsMissing =
    password.length === 0 || (twoFactorEnabled && !/^\d{6}$/.test(code));

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-7">
      <div className="border-b border-slate-200 pb-5">
        <p className="eyebrow">Server recovery</p>
        <h2 className="mt-2 font-serif text-2xl text-ink">Backup and restore</h2>
      </div>

      <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
          <p>
            Backups contain the complete production database and every secret in
            .env. Keep downloaded files private.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Current admin password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </label>
        {twoFactorEnabled && (
          <OtpField
            label="Authenticator code"
            name="code"
            tone="light"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            onPasteValue={setCode}
            placeholder="6-digit code"
            required
          />
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <DatabaseBackup className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold text-ink">Download backup</h3>
              <p className="text-sm text-ink-dim">production.db and .env</p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadBackup}
            disabled={pending !== null || credentialsMissing}
            className="btn-gold mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden />
            {pending === "backup" ? "Preparing…" : "Download backup"}
          </button>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
              <DatabaseBackup className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold text-ink">Save on server</h3>
              <p className="text-sm text-ink-dim">Protected off-project copy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={saveServerBackup}
            disabled={pending !== null || credentialsMissing}
            className="btn-gold mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DatabaseBackup className="size-4" aria-hidden />
            {pending === "server" ? "Saving…" : "Save server backup"}
          </button>
        </article>

        <article className="rounded-xl border border-red-200 bg-red-50/40 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <RotateCcw className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold text-ink">Restore backup</h3>
              <p className="text-sm text-ink-dim">Overwrites both live files</p>
            </div>
          </div>
          <label className="mt-4 block">
            <span className={labelClass}>Backup file</span>
            <input
              ref={fileInput}
              type="file"
              accept=".ccbackup,application/octet-stream"
              onChange={(event) =>
                setRestoreFile(event.target.files?.[0] ?? null)
              }
              className="mt-2 block w-full text-sm text-ink-dim file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-ink"
            />
          </label>
          <label className="mt-4 block">
            <span className={labelClass}>Type RESTORE</span>
            <input
              type="text"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className={inputClass}
              placeholder="RESTORE"
            />
          </label>
          <button
            type="button"
            onClick={restoreBackup}
            disabled={
              pending !== null ||
              credentialsMissing ||
              confirmation !== "RESTORE" ||
              restoreFile === null
            }
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileKey className="size-4" aria-hidden />
            {pending === "restore" ? "Restoring…" : "Restore live files"}
          </button>
        </article>
      </div>

      {notice && (
        <p
          role="status"
          className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {notice.message}
        </p>
      )}
    </section>
  );
}