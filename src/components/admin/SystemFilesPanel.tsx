"use client";

import { useRef, useState } from "react";
import {
  Database,
  Download,
  Eye,
  EyeOff,
  FileKey,
  FileText,
  RotateCcw,
  Save,
  Server,
  ShieldAlert,
} from "lucide-react";
import { OtpField } from "@/components/ui/OtpField";

type FileTarget = "database" | "environment";
type PendingOperation =
  | "download-database"
  | "download-environment"
  | "server"
  | "restore-database"
  | "restore-environment"
  | "load-environment"
  | "save-environment"
  | null;

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass =
  "text-xs font-semibold uppercase tracking-[0.12em] text-ink-dim";
const fileInputClass =
  "mt-2 block w-full text-sm text-ink-dim file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-ink";

export function SystemFilesPanel({
  twoFactorEnabled,
}: {
  twoFactorEnabled: boolean;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [databaseFile, setDatabaseFile] = useState<File | null>(null);
  const [environmentFile, setEnvironmentFile] = useState<File | null>(null);
  const [databaseConfirmation, setDatabaseConfirmation] = useState("");
  const [environmentConfirmation, setEnvironmentConfirmation] = useState("");
  const [environmentText, setEnvironmentText] = useState("");
  const [environmentLoaded, setEnvironmentLoaded] = useState(false);
  const [pending, setPending] = useState<PendingOperation>(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const databaseInput = useRef<HTMLInputElement>(null);
  const environmentInput = useRef<HTMLInputElement>(null);

  function credentials(): FormData {
    const formData = new FormData();
    formData.set("password", password);
    if (twoFactorEnabled) formData.set("code", code);
    return formData;
  }

  function showError(error: unknown, fallback: string) {
    setNotice({
      kind: "error",
      message: error instanceof Error ? error.message : fallback,
    });
  }

  async function downloadFile(target: FileTarget) {
    setPending(`download-${target}`);
    setNotice(null);
    try {
      const formData = credentials();
      formData.set("target", target);
      const response = await fetch("/api/admin/system-backup", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Download failed.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename =
        /filename="([^"]+)"/.exec(disposition)?.[1] ??
        (target === "database" ? "production.db" : ".env");
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
        message: `${target === "database" ? "Database" : ".env"} downloaded. Store it securely.`,
      });
    } catch (error) {
      showError(error, "Download failed.");
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
      if (!response.ok) throw new Error(result.error ?? "Server backup failed.");
      setCode("");
      setNotice({
        kind: "success",
        message: result.success ?? "Separate files were saved on the server.",
      });
    } catch (error) {
      showError(error, "Server backup failed.");
    } finally {
      setPending(null);
    }
  }

  async function restoreFile(target: FileTarget) {
    const file = target === "database" ? databaseFile : environmentFile;
    if (!file) {
      setNotice({ kind: "error", message: `Choose a ${target} backup first.` });
      return;
    }

    setPending(`restore-${target}`);
    setNotice(null);
    try {
      const formData = credentials();
      formData.set("target", target);
      formData.set(
        "confirmation",
        target === "database" ? databaseConfirmation : environmentConfirmation,
      );
      formData.set("backup", file);
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
      if (target === "database") {
        setDatabaseFile(null);
        setDatabaseConfirmation("");
        if (databaseInput.current) databaseInput.current.value = "";
      } else {
        setEnvironmentFile(null);
        setEnvironmentConfirmation("");
        setEnvironmentLoaded(false);
        setEnvironmentText("");
        if (environmentInput.current) environmentInput.current.value = "";
      }
      setNotice({
        kind: "success",
        message:
          result.success ??
          "Restore completed. Restart the systemd service immediately.",
      });
    } catch (error) {
      showError(error, "Restore failed.");
    } finally {
      setPending(null);
    }
  }

  async function loadEnvironment() {
    setPending("load-environment");
    setNotice(null);
    try {
      const formData = credentials();
      formData.set("action", "read");
      const response = await fetch("/api/admin/environment", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const result = (await response.json()) as {
        error?: string;
        content?: string;
      };
      if (!response.ok || typeof result.content !== "string") {
        throw new Error(result.error ?? "The .env file could not be loaded.");
      }
      setEnvironmentText(result.content);
      setEnvironmentLoaded(true);
      setCode("");
      setNotice({
        kind: "success",
        message: ".env loaded into this browser. Keep this screen private.",
      });
    } catch (error) {
      showError(error, "The .env file could not be loaded.");
    } finally {
      setPending(null);
    }
  }

  async function saveEnvironment() {
    if (
      !window.confirm(
        "Save these values to the live .env file? A systemd restart will be required.",
      )
    ) {
      return;
    }

    setPending("save-environment");
    setNotice(null);
    try {
      const formData = credentials();
      formData.set("action", "save");
      formData.set("confirmation", "SAVE ENV");
      formData.set("content", environmentText);
      const response = await fetch("/api/admin/environment", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const result = (await response.json()) as {
        error?: string;
        success?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "The .env file could not be saved.");
      setCode("");
      setNotice({
        kind: "success",
        message:
          result.success ??
          "The .env file was saved. Restart the systemd service to apply it.",
      });
    } catch (error) {
      showError(error, "The .env file could not be saved.");
    } finally {
      setPending(null);
    }
  }

  function hideEnvironment() {
    setEnvironmentText("");
    setEnvironmentLoaded(false);
    setNotice(null);
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
            The database contains all account records and .env contains server
            secrets. Keep both files private.
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

      <div className="mt-7">
        <h3 className="font-semibold text-ink">Download separately</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => downloadFile("database")}
            disabled={pending !== null || credentialsMissing}
            className="btn-gold inline-flex items-center justify-center gap-2 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Database className="size-4" aria-hidden />
            <Download className="size-4" aria-hidden />
            {pending === "download-database" ? "Preparing…" : "Download production.db"}
          </button>
          <button
            type="button"
            onClick={() => downloadFile("environment")}
            disabled={pending !== null || credentialsMissing}
            className="btn-gold inline-flex items-center justify-center gap-2 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="size-4" aria-hidden />
            <Download className="size-4" aria-hidden />
            {pending === "download-environment" ? "Preparing…" : "Download .env"}
          </button>
        </div>
      </div>

      <article className="mt-5 rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white text-cyan-700">
            <Server className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-ink">Save both on server</h3>
            <p className="text-sm text-ink-dim">Creates separate protected .db and .env files.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={saveServerBackup}
          disabled={pending !== null || credentialsMissing}
          className="btn-gold mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="size-4" aria-hidden />
          {pending === "server" ? "Saving…" : "Save separate server backups"}
        </button>
      </article>

      <div className="mt-7">
        <h3 className="font-semibold text-ink">Restore separately</h3>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-red-200 bg-red-50/40 p-4">
            <h4 className="font-semibold text-ink">Restore production.db</h4>
            <label className="mt-3 block">
              <span className={labelClass}>Database file</span>
              <input
                ref={databaseInput}
                type="file"
                accept=".db,application/vnd.sqlite3,application/x-sqlite3,application/octet-stream"
                onChange={(event) => setDatabaseFile(event.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>Type RESTORE DATABASE</span>
              <input
                type="text"
                autoComplete="off"
                value={databaseConfirmation}
                onChange={(event) => setDatabaseConfirmation(event.target.value)}
                className={inputClass}
                placeholder="RESTORE DATABASE"
              />
            </label>
            <button
              type="button"
              onClick={() => restoreFile("database")}
              disabled={
                pending !== null ||
                credentialsMissing ||
                databaseFile === null ||
                databaseConfirmation !== "RESTORE DATABASE"
              }
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="size-4" aria-hidden />
              {pending === "restore-database" ? "Restoring…" : "Restore database"}
            </button>
          </article>

          <article className="rounded-xl border border-red-200 bg-red-50/40 p-4">
            <h4 className="font-semibold text-ink">Restore .env</h4>
            <label className="mt-3 block">
              <span className={labelClass}>Environment file</span>
              <input
                ref={environmentInput}
                type="file"
                accept=".env,.txt,text/plain,application/octet-stream"
                onChange={(event) => setEnvironmentFile(event.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>Type RESTORE ENV</span>
              <input
                type="text"
                autoComplete="off"
                value={environmentConfirmation}
                onChange={(event) => setEnvironmentConfirmation(event.target.value)}
                className={inputClass}
                placeholder="RESTORE ENV"
              />
            </label>
            <button
              type="button"
              onClick={() => restoreFile("environment")}
              disabled={
                pending !== null ||
                credentialsMissing ||
                environmentFile === null ||
                environmentConfirmation !== "RESTORE ENV"
              }
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileKey className="size-4" aria-hidden />
              {pending === "restore-environment" ? "Restoring…" : "Restore .env"}
            </button>
          </article>
        </div>
      </div>

      <article className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Edit .env in browser</h3>
            <p className="text-sm text-ink-dim">Changes require a systemd service restart.</p>
          </div>
          {environmentLoaded ? (
            <button
              type="button"
              onClick={hideEnvironment}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-ink"
            >
              <EyeOff className="size-4" aria-hidden />
              Hide
            </button>
          ) : (
            <button
              type="button"
              onClick={loadEnvironment}
              disabled={pending !== null || credentialsMissing}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eye className="size-4" aria-hidden />
              {pending === "load-environment" ? "Loading…" : "Load .env"}
            </button>
          )}
        </div>

        {environmentLoaded && (
          <div className="mt-4">
            <label className="block">
              <span className={labelClass}>Live environment file</span>
              <textarea
                value={environmentText}
                onChange={(event) => setEnvironmentText(event.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                rows={18}
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="button"
              onClick={saveEnvironment}
              disabled={pending !== null || credentialsMissing || environmentText.length === 0}
              className="btn-gold mt-3 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Save className="size-4" aria-hidden />
              {pending === "save-environment" ? "Saving…" : "Save live .env"}
            </button>
          </div>
        )}
      </article>

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
